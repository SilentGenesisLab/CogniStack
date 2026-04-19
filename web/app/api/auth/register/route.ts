import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, smsCode } = await req.json();

    if (!name || !email || !password || !phone || !smsCode) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "密码至少 8 位" }, { status: 400 });
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: "手机号格式错误" }, { status: 400 });
    }

    // Verify SMS code
    const verification = await prisma.verificationCode.findFirst({
      where: {
        phone,
        code: smsCode,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!verification) {
      return NextResponse.json({ error: "验证码无效或已过期" }, { status: 400 });
    }

    // Check duplicates
    const [emailTaken, phoneTaken] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { phone } }),
    ]);
    if (emailTaken) return NextResponse.json({ error: "邮箱已被注册" }, { status: 409 });
    if (phoneTaken) return NextResponse.json({ error: "手机号已被注册" }, { status: 409 });

    // Mark code used + create user in one transaction
    const [, user] = await prisma.$transaction([
      prisma.verificationCode.update({
        where: { id: verification.id },
        data: { used: true },
      }),
      prisma.user.create({
        data: { name, email, phone, passwordHash: await hash(password, 12) },
        select: { id: true, name: true, email: true },
      }),
    ]);

    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    console.error("[register]", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
