import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ARK_BASE =
  process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
const ARK_KEY = process.env.ARK_API_KEY;
const ARK_MODEL = process.env.ARK_MODEL || "ep-20260312015430-tjwjf";

/* ─── POST: generate / grade / save ─── */

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await req.json();

  switch (body.action) {
    case "generate":
      return handleGenerate(body, session.user.id);
    case "grade":
      return handleGrade(body, session.user.id);
    default:
      return NextResponse.json({ error: "无效操作" }, { status: 400 });
  }
}

/* ─── GET: exam history ─── */

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "未登录" }, { status: 401 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const pageSize = 10;
  const skip = (page - 1) * pageSize;

  const [records, total] = await Promise.all([
    prisma.examRecord.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.examRecord.count({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({
    records,
    total,
    page,
    totalPages: Math.ceil(total / pageSize),
  });
}

/* ─── Generate exam via ARK directly ─── */

async function handleGenerate(
  body: { deckIds?: string[]; count?: number },
  userId: string
) {
  if (!ARK_KEY) {
    return NextResponse.json({ error: "AI 服务未配置" }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { deck: { userId } };
  if (body.deckIds?.length) {
    where.deck = { userId, id: { in: body.deckIds } };
  }

  const cards = await prisma.card.findMany({
    where,
    select: { front: true, back: true },
    take: 50,
  });

  if (cards.length === 0) {
    return NextResponse.json({ error: "没有可用的卡片" }, { status: 400 });
  }

  const count = Math.min(body.count || 10, 20);
  const content = cards
    .map((c, i) => `知识点${i + 1}:\n问: ${c.front}\n答: ${c.back}`)
    .join("\n\n");

  const mcCount = Math.ceil(count * 0.4);
  const fillCount = Math.ceil(count * 0.3);
  const shortCount = count - mcCount - fillCount;

  const prompt = `请根据以下知识点生成一份考卷。

要求：
1. 选择题 ${mcCount} 道：每题4个选项，标注正确答案索引(0-3)和解析
2. 填空题 ${fillCount} 道：用 ___ 标记空白处，给出正确答案和解析
3. 简答题 ${shortCount} 道：给出参考答案和评分要点

返回 JSON 格式:
{
  "questions": [
    {"type":"choice","question":"...","options":["A","B","C","D"],"correctIndex":0,"answer":"A","explanation":"..."},
    {"type":"fill","question":"___是...","answer":"正确答案","explanation":"..."},
    {"type":"short","question":"请简述...","answer":"参考答案","keyPoints":["要点1","要点2"],"explanation":"..."}
  ]
}

知识点内容：
${content}

请仅返回有效JSON，不要附加任何其他文字。`;

  try {
    const res = await fetch(`${ARK_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ARK_KEY}`,
      },
      body: JSON.stringify({
        model: ARK_MODEL,
        messages: [
          {
            role: "system",
            content:
              "你是一位专业的教育考试出题专家。请只返回有效的JSON，不要添加任何markdown格式标记。",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[exam] ARK error:", err);
      return NextResponse.json({ error: "AI 生成失败，请重试" }, { status: 502 });
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";

    let parsed: { questions?: unknown[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("[exam] JSON parse error, raw:", text.slice(0, 500));
      return NextResponse.json({ error: "AI 返回格式异常，请重试" }, { status: 502 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questions = (parsed.questions || []).map((q: any, i: number) => ({
      id: i + 1,
      type: q.type || "choice",
      question: q.question || "",
      options: q.options || undefined,
      correctIndex: q.correctIndex ?? q.correct_index ?? 0,
      answer: q.answer || "",
      keyPoints: q.keyPoints || q.key_points || undefined,
      explanation: q.explanation || "",
    }));

    if (questions.length === 0) {
      return NextResponse.json({ error: "AI 未生成有效题目" }, { status: 502 });
    }

    return NextResponse.json({ questions });
  } catch (e) {
    console.error("[exam] generate error:", e);
    const msg =
      e instanceof Error && e.name === "TimeoutError"
        ? "AI 生成超时，请减少题目数量后重试"
        : "生成考卷失败，请重试";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

/* ─── Grade + save to DB ─── */

async function handleGrade(
  body: {
    questions: {
      id: number;
      type: string;
      question: string;
      answer?: string;
      correctIndex?: number;
      options?: string[];
      keyPoints?: string[];
      explanation?: string;
    }[];
    answers: Record<number, string>;
    title?: string;
  },
  userId: string
) {
  const { questions, answers } = body;
  if (!questions?.length) {
    return NextResponse.json({ error: "缺少题目" }, { status: 400 });
  }

  let totalScore = 0;
  let maxScore = 0;

  const results = questions.map((q) => {
    const userAnswer = (answers?.[q.id] || "").trim();
    let score = 0;
    let maxQ = 10;
    let correct = false;

    if (q.type === "choice") {
      maxQ = 10;
      correct = parseInt(userAnswer) === q.correctIndex;
      score = correct ? 10 : 0;
    } else if (q.type === "fill") {
      maxQ = 10;
      const expected = (q.answer || "").trim().toLowerCase();
      const given = userAnswer.toLowerCase();
      if (given === expected) {
        score = 10;
        correct = true;
      } else if (given && (expected.includes(given) || given.includes(expected))) {
        score = 5;
      }
    } else if (q.type === "short") {
      maxQ = 20;
      const kp = q.keyPoints || [];
      if (kp.length > 0) {
        let matched = 0;
        for (const point of kp) {
          if (userAnswer.toLowerCase().includes(point.toLowerCase())) matched++;
        }
        score = Math.round((matched / kp.length) * 20);
      } else if (userAnswer.length > 0 && q.answer) {
        const ref = q.answer.toLowerCase();
        const overlap = ref
          .split("")
          .filter((c) => userAnswer.toLowerCase().includes(c)).length;
        score = Math.min(20, Math.round((overlap / Math.max(ref.length, 1)) * 20));
      }
      correct = score >= 16;
    }

    totalScore += score;
    maxScore += maxQ;

    return {
      id: q.id,
      type: q.type,
      question: q.question,
      userAnswer,
      correctAnswer:
        q.type === "choice" ? q.options?.[q.correctIndex || 0] || q.answer : q.answer,
      correct,
      score,
      maxScore: maxQ,
      explanation: q.explanation || "",
    };
  });

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  // Save to DB
  const record = await prisma.examRecord.create({
    data: {
      userId,
      title: body.title || "复盘考试",
      questions: questions as unknown as Record<string, unknown>[],
      answers: answers as unknown as Record<string, unknown>,
      totalScore,
      maxScore,
      percentage,
      results: results as unknown as Record<string, unknown>[],
    },
  });

  return NextResponse.json({
    id: record.id,
    totalScore,
    maxScore,
    percentage,
    results,
  });
}
