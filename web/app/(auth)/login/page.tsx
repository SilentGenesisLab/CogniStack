"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

type AuthTab = "email" | "phone";

export default function LoginPage() {
  const [tab, setTab] = useState<AuthTab>("email");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: implement login logic
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-4">
      <Card padding="lg" className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-sm bg-primary text-white font-bold">
            C
          </div>
          <h1 className="text-xl font-semibold text-text-primary">
            登录 CogniStack
          </h1>
          <p className="mt-1 text-sm text-text-muted">认知增强，从这里开始</p>
        </div>

        {/* Tab Switcher */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "email" ? (
            <>
              <Input
                label="邮箱"
                type="email"
                placeholder="请输入邮箱地址"
                required
              />
              <Input
                label="密码"
                type="password"
                placeholder="请输入密码"
                required
              />
            </>
          ) : (
            <>
              <Input
                label="手机号"
                type="tel"
                placeholder="请输入手机号"
                required
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    label="验证码"
                    type="text"
                    placeholder="请输入验证码"
                    maxLength={6}
                    required
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="secondary" size="md">
                    获取验证码
                  </Button>
                </div>
              </div>
            </>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            登录
          </Button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-text-muted">
          还没有账号？{" "}
          <Link
            href="/register"
            className="text-primary hover:text-primary-hover"
          >
            立即注册
          </Link>
        </p>
      </Card>
    </div>
  );
}
