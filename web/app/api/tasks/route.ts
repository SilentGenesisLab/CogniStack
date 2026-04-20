import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const listId = searchParams.get("listId");
  const quadrant = searchParams.get("quadrant");
  const view = searchParams.get("view"); // "quadrant" returns all grouped

  const where: Record<string, unknown> = {
    userId: session.user.id,
    parentId: null, // top-level only
  };

  if (listId) where.listId = listId;
  if (quadrant) where.quadrant = quadrant;

  const tasks = await prisma.task.findMany({
    where,
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
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  if (view === "quadrant") {
    const grouped = {
      URGENT_IMPORTANT: tasks.filter((t) => t.quadrant === "URGENT_IMPORTANT"),
      NOT_URGENT_IMPORTANT: tasks.filter((t) => t.quadrant === "NOT_URGENT_IMPORTANT"),
      URGENT_NOT_IMPORTANT: tasks.filter((t) => t.quadrant === "URGENT_NOT_IMPORTANT"),
      NOT_URGENT_NOT_IMPORTANT: tasks.filter((t) => t.quadrant === "NOT_URGENT_NOT_IMPORTANT"),
    };
    return NextResponse.json(grouped);
  }

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, listId, parentId, quadrant, dueAt, priority } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "任务标题不能为空" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      description: description || null,
      userId: session.user.id,
      listId: listId || null,
      parentId: parentId || null,
      quadrant: quadrant || "NOT_URGENT_NOT_IMPORTANT",
      priority: priority || 0,
      dueAt: dueAt ? new Date(dueAt) : null,
    },
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

  return NextResponse.json(task, { status: 201 });
}
