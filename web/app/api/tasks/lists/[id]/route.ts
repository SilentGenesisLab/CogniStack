import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  const list = await prisma.taskList.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!list) {
    return NextResponse.json({ error: "清单不存在" }, { status: 404 });
  }

  // Get task stats
  const [totalTasks, completedTasks, tasksWithDuration] = await Promise.all([
    prisma.task.count({ where: { listId: id, userId: session.user.id } }),
    prisma.task.count({
      where: { listId: id, userId: session.user.id, completedAt: { not: null } },
    }),
    prisma.task.findMany({
      where: {
        listId: id,
        userId: session.user.id,
        completedAt: { not: null },
        duration: { not: null },
      },
      select: { duration: true, completedAt: true },
      orderBy: { completedAt: "desc" },
    }),
  ]);

  const totalDuration = tasksWithDuration.reduce(
    (sum, t) => sum + (t.duration || 0),
    0
  );

  return NextResponse.json({
    ...list,
    stats: {
      totalTasks,
      completedTasks,
      totalDuration,
      completedTasksWithTime: tasksWithDuration,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, color, sortOrder } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (color !== undefined) data.color = color;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;

  const list = await prisma.taskList.updateMany({
    where: { id, userId: session.user.id },
    data,
  });

  if (list.count === 0) {
    return NextResponse.json({ error: "清单不存在" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.taskList.deleteMany({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
