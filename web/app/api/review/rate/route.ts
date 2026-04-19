import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Simplified FSRS scheduling (MVP)
// rating: 1=Again, 2=Hard, 3=Good, 4=Easy
function schedule(
  stability: number,
  difficulty: number,
  rating: number
): { stability: number; difficulty: number; dueAt: Date } {
  const isFirst = stability === 0;
  let s: number;
  let d: number;

  if (isFirst) {
    // First review: init stability by rating
    const initS = [0, 1, 4, 14, 60];
    s = initS[rating] ?? 1;
    d = Math.max(1, Math.min(10, 6 - rating));
  } else {
    const mult = [0, 0.5, 1.2, 2.0, 2.5][rating] ?? 1;
    s = Math.max(1, stability * mult);
    d = Math.max(1, Math.min(10, difficulty + (4 - rating) * 0.2));
  }

  const dueAt = new Date(Date.now() + Math.round(s) * 24 * 60 * 60 * 1000);
  return { stability: s, difficulty: d, dueAt };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { cardId, rating, timeSpent = 0 } = await req.json();

  if (!cardId || rating < 1 || rating > 4) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const card = await prisma.card.findFirst({
    where: { id: cardId, deck: { userId: session.user.id } },
  });
  if (!card) return NextResponse.json({ error: "卡片不存在" }, { status: 404 });

  const next = schedule(card.stability, card.difficulty, rating);

  const [updated] = await prisma.$transaction([
    prisma.card.update({
      where: { id: cardId },
      data: next,
    }),
    prisma.reviewLog.create({
      data: { cardId, rating, timeSpent },
    }),
  ]);

  return NextResponse.json({ card: updated, nextDue: next.dueAt });
}
