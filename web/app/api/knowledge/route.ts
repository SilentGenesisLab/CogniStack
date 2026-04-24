import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "未登录" }, { status: 401 });

  const seeds = await prisma.knowledgeSeed.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      deck: { select: { id: true, title: true, _count: { select: { cards: true } } } },
    },
  });

  return NextResponse.json({ seeds });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { title, content, type, source } = await req.json();
  if (!title?.trim() || !content?.trim())
    return NextResponse.json({ error: "标题和内容不能为空" }, { status: 400 });

  const seed = await prisma.knowledgeSeed.create({
    data: {
      title: title.trim(),
      content: content.trim(),
      type: type || "text",
      source: source || null,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ seed }, { status: 201 });
}
