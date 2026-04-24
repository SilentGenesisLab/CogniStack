import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const seed = await prisma.knowledgeSeed.findFirst({
    where: { id, userId: session.user.id },
    include: {
      deck: { select: { id: true, title: true, _count: { select: { cards: true } } } },
    },
  });

  if (!seed) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ seed });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title.trim();
  if (body.content !== undefined) data.content = body.content.trim();
  if (body.type !== undefined) data.type = body.type;
  if (body.source !== undefined) data.source = body.source || null;

  const seed = await prisma.knowledgeSeed.updateMany({
    where: { id, userId: session.user.id },
    data,
  });

  if (seed.count === 0)
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const result = await prisma.knowledgeSeed.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (result.count === 0)
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
