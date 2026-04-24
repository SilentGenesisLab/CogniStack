import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import OSS from "ali-oss";

const client = new OSS({
  region: "oss-cn-beijing",
  accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  bucket: process.env.OSS_BUCKET!,
});

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

  const mimeToExt: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" };
  const ext = mimeToExt[file.type] || file.name?.split(".").pop() || "png";
  const prefix = process.env.OSS_PREFIX || "temp";
  const key = `${prefix}/tasks/${session.user.id}/${Date.now()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await client.put(key, buffer, {
    mime: file.type || "image/png",
  });

  const url = result.url.replace(/^http:/, "https:");

  return NextResponse.json({ url });
}
