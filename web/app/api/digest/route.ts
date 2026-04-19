import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const AI_URL = process.env.AI_SERVICE_URL || "http://ai:8000";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const { content, title } = await req.json();
    if (!content?.trim())
      return NextResponse.json({ error: "内容不能为空" }, { status: 400 });

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

    const deckTitle =
      title?.trim() ||
      (key_points[0] as string)?.slice(0, 50) ||
      content.slice(0, 50);

    const deck = await prisma.deck.create({
      data: {
        title: deckTitle,
        description: summary,
        userId: session.user.id,
        cards: {
          create: (flashcards as { front: string; back: string }[]).map(
            (fc) => ({ front: fc.front, back: fc.back })
          ),
        },
      },
      include: { cards: true },
    });

    return NextResponse.json({ deck, summary, key_points });
  } catch (e) {
    console.error("[digest]", e);
    return NextResponse.json({ error: "处理失败，请重试" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "未登录" }, { status: 401 });

  const decks = await prisma.deck.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { cards: true } } },
  });

  return NextResponse.json({ decks });
}
