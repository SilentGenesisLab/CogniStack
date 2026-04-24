"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

type AuthTab = "email" | "phone";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [smsSent, setSmsSent] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);

  const sendSms = async () => {
    setSmsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSmsSent(true);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSmsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn(
      tab === "email" ? "credentials" : "phone",
      {
        ...(tab === "email" ? { email, password } : { phone, code }),
        redirect: false,
      }
    );

    if (res?.error) {
      setError("账号或密码错误，请重试");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-4">
      <Card padding="lg" className="w-full max-w-[400px]">
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="CogniStack" className="mx-auto mb-3 h-10 w-10 rounded-sm" />
          <h1 className="text-xl font-semibold text-text-primary">登录 CogniStack</h1>
          <p className="mt-1 text-sm text-text-muted">认知增强，从这里开始</p>
        </div>

        <div className="mb-6 flex rounded-sm bg-surface-secondary p-1">
          <button
            type="button"
            onClick={() => setTab("email")}
            className={`flex-1 rounded-sm py-2 text-sm font-medium transition-colors ${
              tab === "email"
                ? "bg-surface text-text-primary shadow-sm"
                : "text-text-secondary"
            }`}
          >
            邮箱登录
          </button>
          <button
            type="button"
            onClick={() => setTab("phone")}
            className={`flex-1 rounded-sm py-2 text-sm font-medium transition-colors ${
              tab === "phone"
                ? "bg-surface text-text-primary shadow-sm"
                : "text-text-secondary"
            }`}
          >
            手机登录
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-sm bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "email" ? (
            <>
              <Input
                label="邮箱"
                type="email"
                placeholder="请输入邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="密码"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </>
          ) : (
            <>
              <Input
                label="手机号"
                type="tel"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    label="验证码"
                    type="text"
                    placeholder="6 位验证码"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={sendSms}
                    loading={smsLoading}
                    disabled={smsSent || !phone}
                  >
                    {smsSent ? "已发送" : "获取验证码"}
                  </Button>
                </div>
              </div>
            </>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            登录
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          还没有账号？{" "}
          <Link href="/register" className="text-primary hover:text-primary-hover">
            立即注册
          </Link>
        </p>
      </Card>
    </div>
  );
}
