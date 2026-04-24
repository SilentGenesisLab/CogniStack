import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "未登录" }, { status: 401 });

  const allCards = await prisma.card.findMany({
    where: { deck: { userId: session.user.id } },
    select: { stability: true, dueAt: true },
  });

  const now = new Date();
  let forgot = 0;     // stability <= 1
  let fuzzy = 0;      // 1 < stability <= 4
  let remembered = 0; // 4 < stability <= 14
  let mastered = 0;   // stability > 14
  let unlearned = 0;  // stability === 0
  let dueCount = 0;

  for (const c of allCards) {
    if (c.stability === 0) unlearned++;
    else if (c.stability <= 1) forgot++;
    else if (c.stability <= 4) fuzzy++;
    else if (c.stability <= 14) remembered++;
    else mastered++;

    if (c.dueAt <= now) dueCount++;
  }

  const total = allCards.length;

  // Per-deck stats
  const decks = await prisma.deck.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      title: true,
      _count: { select: { cards: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    total,
    dueCount,
    mastery: {
      unlearned: { count: unlearned, ratio: total ? unlearned / total : 0 },
      forgot: { count: forgot, ratio: total ? forgot / total : 0 },
      fuzzy: { count: fuzzy, ratio: total ? fuzzy / total : 0 },
      remembered: { count: remembered, ratio: total ? remembered / total : 0 },
      mastered: { count: mastered, ratio: total ? mastered / total : 0 },
    },
    decks,
  });
}
