import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const AI_URL = process.env.AI_SERVICE_URL || "http://ai:8000";

/** Fire-and-forget: creates deck + cards, updates seed status */
async function processDigest(seedId: string, content: string, userId: string) {
  try {
    await prisma.knowledgeSeed.update({
      where: { id: seedId },
      data: { status: "processing" },
    });

    const aiRes = await fetch(`${AI_URL}/digest/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, content_type: "text" }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      console.error("[digest] AI error:", err);
      throw new Error("AI service error");
    }

    const { summary, key_points, flashcards } = await aiRes.json();

    const seed = await prisma.knowledgeSeed.findUnique({
      where: { id: seedId },
    });
    const deckTitle =
      seed?.title || (key_points[0] as string)?.slice(0, 50) || content.slice(0, 50);

    const deck = await prisma.deck.create({
      data: {
        title: deckTitle,
        description: summary,
        userId,
        cards: {
          create: (flashcards as { front: string; back: string }[]).map(
            (fc) => ({ front: fc.front, back: fc.back })
          ),
        },
      },
    });

    await prisma.knowledgeSeed.update({
      where: { id: seedId },
      data: {
        status: "completed",
        summary,
        keyPoints: key_points as string[],
        deckId: deck.id,
      },
    });
  } catch (e) {
    console.error("[digest] processDigest error:", e);
    await prisma.knowledgeSeed.update({
      where: { id: seedId },
      data: {
        status: "failed",
        errorMessage: e instanceof Error ? e.message : "未知错误",
      },
    });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const { content, title } = await req.json();
    if (!content?.trim())
      return NextResponse.json({ error: "内容不能为空" }, { status: 400 });

    const seedTitle = title?.trim() || content.slice(0, 50);

    const seed = await prisma.knowledgeSeed.create({
      data: {
        title: seedTitle,
        content,
        type: "text",
        status: "pending",
        userId: session.user.id,
      },
    });

    // Fire-and-forget — don't await
    processDigest(seed.id, content, session.user.id).catch(() => {});

    return NextResponse.json({ seed });
  } catch (e) {
    console.error("[digest]", e);
    return NextResponse.json({ error: "处理失败，请重试" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "未登录" }, { status: 401 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20")));
  const skip = (page - 1) * pageSize;

  const [seeds, total] = await Promise.all([
    prisma.knowledgeSeed.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        deck: {
          include: { _count: { select: { cards: true } }, cards: true },
        },
      },
    }),
    prisma.knowledgeSeed.count({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({
    seeds,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
