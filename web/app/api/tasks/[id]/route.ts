import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

  const task = await prisma.task.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!task) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.quadrant !== undefined) data.quadrant = body.quadrant;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.listId !== undefined) data.listId = body.listId || null;
  if (body.dueAt !== undefined) data.dueAt = body.dueAt ? new Date(body.dueAt) : null;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  if (body.completed !== undefined) {
    data.completedAt = body.completed ? new Date() : null;
  }

  const updated = await prisma.task.update({
    where: { id },
    data,
    include: {
      subtasks: {
        orderBy: { sortOrder: "asc" },
        include: {
          subtasks: {
            orderBy: { sortOrder: "asc" },
            include: {
              subtasks: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
      list: { select: { id: true, name: true, color: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!task) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  await prisma.task.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
