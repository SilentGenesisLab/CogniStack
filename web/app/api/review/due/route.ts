import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * Mastery levels based on stability ranges:
 * 1 (忘了): stability <= 1
 * 2 (模糊): stability <= 4
 * 3 (记得): stability <= 14
 * 4 (很熟): stability > 14
 */
function stabilityRange(mastery: number): { gte?: number; lte?: number; gt?: number } {
  switch (mastery) {
    case 1: return { lte: 1 };
    case 2: return { gt: 1, lte: 4 };
    case 3: return { gt: 4, lte: 14 };
    case 4: return { gt: 14 };
    default: return {};
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "未登录" }, { status: 401 });

  const url = new URL(req.url);
  const deckIds = url.searchParams.get("deckIds")?.split(",").filter(Boolean);
  const mastery = url.searchParams.get("mastery"); // "1", "2", "3", "4" or comma-separated
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "30")));
  const mode = url.searchParams.get("mode") || "due"; // "due" or "all"

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    deck: { userId: session.user.id },
  };

  // Filter by deck
  if (deckIds && deckIds.length > 0) {
    where.deck.id = { in: deckIds };
  }

  // Filter by due date (only in "due" mode)
  if (mode === "due") {
    where.dueAt = { lte: new Date() };
  }

  // Filter by mastery (stability range)
  if (mastery) {
    const levels = mastery.split(",").map(Number).filter((n) => n >= 1 && n <= 4);
    if (levels.length === 1) {
      where.stability = stabilityRange(levels[0]);
    } else if (levels.length > 1) {
      where.OR = levels.map((l) => ({ stability: stabilityRange(l) }));
    }
  }

  const cards = await prisma.card.findMany({
    where,
    include: { deck: { select: { id: true, title: true } } },
    orderBy: { dueAt: "asc" },
    take: limit,
  });

  return NextResponse.json({ cards, total: cards.length });
}
