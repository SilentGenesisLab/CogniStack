import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import OSS from "ali-oss";
import { randomUUID } from "crypto";

const ALLOWED_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

let _client: OSS | null = null;
function getOSSClient() {
  if (!_client) {
    _client = new OSS({
      region: "oss-cn-beijing",
      accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
      bucket: process.env.OSS_BUCKET!,
    });
  }
  return _client;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "缺少文件" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "文件过大，最大 5MB" }, { status: 413 });
  }

  const ext = ALLOWED_MIME[file.type];
  if (!ext) {
    return NextResponse.json({ error: "仅支持 PNG/JPG/GIF/WebP" }, { status: 400 });
  }

  const prefix = process.env.OSS_PREFIX || "temp";
  const key = `${prefix}/tasks/${session.user.id}/${randomUUID()}.${ext}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await getOSSClient().put(key, buffer, { mime: file.type });
    const url = result.url.replace(/^http:/, "https:");
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[upload] OSS error:", e);
    return NextResponse.json({ error: "上传失败，请重试" }, { status: 500 });
  }
}
