import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const lists = await prisma.taskList.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { tasks: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(lists);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { name, color } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "清单名称不能为空" }, { status: 400 });
  }

  const maxSort = await prisma.taskList.aggregate({
    where: { userId: session.user.id },
    _max: { sortOrder: true },
  });

  const list = await prisma.taskList.create({
    data: {
      name: name.trim(),
      color: color || "#3B82F6",
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      userId: session.user.id,
    },
  });

  return NextResponse.json(list, { status: 201 });
}
