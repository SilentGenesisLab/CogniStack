"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [smsSent, setSmsSent] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const sendSms = async () => {
    if (!phone) { setError("请先填写手机号"); return; }
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
      // 60s countdown
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(timer); setSmsSent(false); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSmsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    if (!smsCode) {
      setError("请输入手机验证码");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, smsCode, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "注册失败");
        return;
      }

      // Auto login after register
      const loginRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (loginRes?.error) {
        router.push("/login");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-4">
      <Card padding="lg" className="w-full max-w-[420px]">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-sm bg-primary text-white font-bold">
            C
          </div>
          <h1 className="text-xl font-semibold text-text-primary">注册 CogniStack</h1>
          <p className="mt-1 text-sm text-text-muted">创建你的认知增强账户</p>
        </div>

        {error && (
          <p className="mb-4 rounded-sm bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="昵称"
            placeholder="请输入昵称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="邮箱"
            type="email"
            placeholder="请输入邮箱地址"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {/* Phone + SMS */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              手机号
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="flex-1 rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={sendSms}
                loading={smsLoading}
                disabled={smsSent}
                className="flex-shrink-0 whitespace-nowrap"
              >
                {smsSent ? `${countdown}s 后重发` : "获取验证码"}
              </Button>
            </div>
          </div>

          <Input
            label="短信验证码"
            type="text"
            placeholder="请输入 6 位验证码"
            maxLength={6}
            value={smsCode}
            onChange={(e) => setSmsCode(e.target.value)}
            required
          />

          <Input
            label="密码"
            type="password"
            placeholder="请设置密码（至少 8 位）"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="确认密码"
            type="password"
            placeholder="请再次输入密码"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          <Button type="submit" className="w-full" loading={loading}>
            注册
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          已有账号？{" "}
          <Link href="/login" className="text-primary hover:text-primary-hover">
            立即登录
          </Link>
        </p>
      </Card>
    </div>
  );
}
