"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-text-primary">设置</h1>

      <Card>
        <h3 className="mb-4 font-medium text-text-primary">个人信息</h3>
        <div className="max-w-md space-y-4">
          <Input label="昵称" placeholder="请输入昵称" />
          <Input label="邮箱" type="email" placeholder="请输入邮箱" />
          <Input label="手机号" type="tel" placeholder="请输入手机号" />
          <Button>保存</Button>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-medium text-text-primary">偏好设置</h3>
        <div className="max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">每日复习提醒</span>
            <span className="text-sm text-text-muted">即将上线</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">每日学习目标</span>
            <span className="text-sm text-text-muted">即将上线</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
