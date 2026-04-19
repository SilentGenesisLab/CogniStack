import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "未登录" }, { status: 401 });

  const cards = await prisma.card.findMany({
    where: {
      deck: { userId: session.user.id },
      dueAt: { lte: new Date() },
    },
    include: { deck: { select: { title: true } } },
    orderBy: { dueAt: "asc" },
    take: 30,
  });

  return NextResponse.json({ cards, total: cards.length });
}
