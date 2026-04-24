import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const AI_URL = process.env.AI_SERVICE_URL || "http://ai:8000";

interface ExamCard {
  front: string;
  back: string;
}

/**
 * POST /api/review/exam
 * body.action = "generate" | "grade"
 *
 * generate: { action:"generate", cardIds: string[] }
 *   → calls AI to produce mixed exam (选择题、填空题、简答题)
 *
 * grade: { action:"grade", questions: [...], answers: [...] }
 *   → scores the exam
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  if (action === "generate") {
    return handleGenerate(body, session.user.id);
  } else if (action === "grade") {
    return handleGrade(body);
  }
  return NextResponse.json({ error: "无效操作" }, { status: 400 });
}

async function handleGenerate(
  body: { cardIds?: string[]; deckIds?: string[]; count?: number },
  userId: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { deck: { userId } };
  if (body.cardIds?.length) {
    where.id = { in: body.cardIds };
  } else if (body.deckIds?.length) {
    where.deck.id = { in: body.deckIds };
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
  const content = buildContentFromCards(cards);

  try {
    const prompt = buildExamPrompt(content, count);

    const aiRes = await fetch(`${AI_URL}/generate-quiz/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: prompt,
        count,
        difficulty: "medium",
      }),
      signal: AbortSignal.timeout(60_000),
    });

    // The AI quiz endpoint only generates MC. We'll call ARK directly for mixed types.
    // Use a direct prompt approach via the digest-style endpoint.
    if (!aiRes.ok) {
      // Fallback: call AI service directly with custom prompt
      return await generateViaDirectCall(content, count);
    }

    const data = await aiRes.json();
    // Transform to our exam format — these are all MC questions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questions = (data.questions || []).map((q: any, i: number) => ({
      id: i + 1,
      type: "choice" as const,
      question: q.question,
      options: q.options,
      correctIndex: q.correct_index,
      explanation: q.explanation,
    }));

    return NextResponse.json({ questions });
  } catch {
    // Fallback to direct call
    return await generateViaDirectCall(content, count);
  }
}

function buildContentFromCards(cards: ExamCard[]): string {
  return cards
    .map((c, i) => `知识点${i + 1}:\n问: ${c.front}\n答: ${c.back}`)
    .join("\n\n");
}

function buildExamPrompt(content: string, count: number): string {
  const mcCount = Math.ceil(count * 0.4);
  const fillCount = Math.ceil(count * 0.3);
  const shortCount = count - mcCount - fillCount;

  return `你是一位考试出题专家。请根据以下知识点生成一份考卷，要求：

1. 选择题 ${mcCount} 道：每题4个选项(A/B/C/D)，标注正确答案索引(0-3)和解析
2. 填空题 ${fillCount} 道：用 ___ 标记空白处，给出正确答案和解析
3. 简答题 ${shortCount} 道：给出参考答案和评分要点

请返回 JSON 格式:
{
  "questions": [
    {
      "type": "choice",
      "question": "题目",
      "options": ["A选项", "B选项", "C选项", "D选项"],
      "correctIndex": 0,
      "answer": "A选项",
      "explanation": "解析"
    },
    {
      "type": "fill",
      "question": "___是...",
      "answer": "正确答案",
      "explanation": "解析"
    },
    {
      "type": "short",
      "question": "请简述...",
      "answer": "参考答案",
      "keyPoints": ["要点1", "要点2"],
      "explanation": "解析"
    }
  ]
}

知识点内容：
${content}

请仅返回有效JSON。`;
}

async function generateViaDirectCall(content: string, count: number) {
  // Call AI service's generic chat endpoint or use ARK directly
  const AI_BASE = process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
  const API_KEY = process.env.ARK_API_KEY;
  const MODEL = process.env.ARK_MODEL || "ep-20260312015430-tjwjf";

  if (!API_KEY) {
    return NextResponse.json({ error: "AI 服务未配置" }, { status: 500 });
  }

  const prompt = buildExamPrompt(content, count);

  try {
    const res = await fetch(`${AI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: "你是一位专业的教育考试出题专家，擅长根据知识点生成高质量的考试题目。请只返回有效的JSON。",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[exam] ARK error:", err);
      return NextResponse.json({ error: "生成考卷失败" }, { status: 500 });
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(text);

    // Normalize questions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questions = (parsed.questions || []).map((q: any, i: number) => ({
      id: i + 1,
      ...q,
    }));

    return NextResponse.json({ questions });
  } catch (e) {
    console.error("[exam] generate error:", e);
    return NextResponse.json({ error: "生成考卷失败，请重试" }, { status: 500 });
  }
}

function handleGrade(body: {
  questions: {
    id: number;
    type: string;
    question: string;
    answer: string;
    correctIndex?: number;
    options?: string[];
    keyPoints?: string[];
  }[];
  answers: Record<number, string>;
}) {
  const { questions, answers } = body;
  if (!questions?.length) {
    return NextResponse.json({ error: "缺少题目" }, { status: 400 });
  }

  let totalScore = 0;
  let maxScore = 0;
  const results = questions.map((q) => {
    const userAnswer = (answers?.[q.id] || "").trim();
    let score = 0;
    let maxQuestionScore = 10;
    let correct = false;

    if (q.type === "choice") {
      maxQuestionScore = 10;
      // User answer is the index as string
      const userIdx = parseInt(userAnswer);
      correct = userIdx === q.correctIndex;
      score = correct ? 10 : 0;
    } else if (q.type === "fill") {
      maxQuestionScore = 10;
      // Exact or fuzzy match
      const expected = (q.answer || "").trim().toLowerCase();
      const given = userAnswer.toLowerCase();
      if (given === expected) {
        score = 10;
        correct = true;
      } else if (expected.includes(given) || given.includes(expected)) {
        score = 5;
        correct = false; // partial
      }
    } else if (q.type === "short") {
      maxQuestionScore = 20;
      // Simple keyword matching for short answers
      const kp = q.keyPoints || [];
      if (kp.length > 0) {
        let matched = 0;
        for (const point of kp) {
          if (userAnswer.toLowerCase().includes(point.toLowerCase())) {
            matched++;
          }
        }
        score = Math.round((matched / kp.length) * 20);
      } else {
        // Compare with reference answer
        const ref = (q.answer || "").toLowerCase();
        if (userAnswer.length > 0) {
          const overlap = ref.split("").filter((c) => userAnswer.toLowerCase().includes(c)).length;
          score = Math.min(20, Math.round((overlap / Math.max(ref.length, 1)) * 20));
        }
      }
      correct = score >= 16;
    }

    totalScore += score;
    maxScore += maxQuestionScore;

    return {
      id: q.id,
      type: q.type,
      question: q.question,
      userAnswer,
      correctAnswer: q.type === "choice" ? q.options?.[q.correctIndex || 0] : q.answer,
      correct,
      score,
      maxScore: maxQuestionScore,
      explanation: (q as Record<string, unknown>).explanation || "",
    };
  });

  return NextResponse.json({
    totalScore,
    maxScore,
    percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
    results,
  });
}
