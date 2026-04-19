"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: implement registration logic
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
            注册 CogniStack
          </h1>
          <p className="mt-1 text-sm text-text-muted">创建你的认知增强账户</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="昵称" placeholder="请输入昵称" required />
          <Input
            label="邮箱"
            type="email"
            placeholder="请输入邮箱地址"
            required
          />
          <Input
            label="密码"
            type="password"
            placeholder="请设置密码（至少 8 位）"
            minLength={8}
            required
          />
          <Input
            label="确认密码"
            type="password"
            placeholder="请再次输入密码"
            required
          />

          <Button type="submit" className="w-full" loading={loading}>
            注册
          </Button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-text-muted">
          已有账号？{" "}
          <Link
            href="/login"
            className="text-primary hover:text-primary-hover"
          >
            立即登录
          </Link>
        </p>
      </Card>
    </div>
  );
}
