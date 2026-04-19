import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

function percentEncode(str: string) {
  return encodeURIComponent(str)
    .replace(/\+/g, "%20")
    .replace(/\*/g, "%2A")
    .replace(/%7E/g, "~");
}

async function sendAliyunSms(phone: string, code: string) {
  const params: Record<string, string> = {
    AccessKeyId: process.env.SMS_ACCESS_KEY_ID!,
    Action: "SendSms",
    Format: "JSON",
    PhoneNumbers: phone,
    RegionId: process.env.SMS_REGION || "cn-hangzhou",
    SignName: process.env.SMS_SIGN_NAME!,
    SignatureMethod: "HMAC-SHA1",
    SignatureNonce: crypto.randomUUID().replace(/-/g, ""),
    SignatureVersion: "1.0",
    TemplateCode: process.env.SMS_TEMPLATE_CODE!,
    TemplateParam: JSON.stringify({ code }),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    Version: "2017-05-25",
  };

  const sortedKeys = Object.keys(params).sort();
  const canonicalQuery = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join("&");
  const stringToSign = `POST&${percentEncode("/")}&${percentEncode(canonicalQuery)}`;

  const signature = crypto
    .createHmac("sha1", process.env.SMS_ACCESS_KEY_SECRET! + "&")
    .update(stringToSign)
    .digest("base64");

  params.Signature = signature;

  const body = new URLSearchParams(params).toString();
  const res = await fetch("https://dysmsapi.aliyuncs.com/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: "手机号格式错误" }, { status: 400 });
    }

    // Rate limit: 1 SMS per minute per phone
    const recent = await prisma.verificationCode.findFirst({
      where: { phone, createdAt: { gt: new Date(Date.now() - 60_000) } },
    });
    if (recent) {
      return NextResponse.json({ error: "请稍后再试（每分钟限 1 条）" }, { status: 429 });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await prisma.verificationCode.create({ data: { phone, code, expiresAt } });

    const result = await sendAliyunSms(phone, code);
    if (result.Code !== "OK") {
      return NextResponse.json(
        { error: result.Message || "短信发送失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[sms/send]", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
