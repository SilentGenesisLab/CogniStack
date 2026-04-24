"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Inbox,
  Layers,
  Brain,
  CheckSquare,
  BarChart3,
  Users,
  Settings,
} from "lucide-react";

const navItems = [
  { label: "今日概览", href: "/dashboard", icon: LayoutDashboard },
  { label: "知识消化", href: "/digest", icon: Inbox },
  { label: "闪卡复盘", href: "/review", icon: Layers },
  { label: "认知训练", href: "/training", icon: Brain },
  { label: "任务清单", href: "/tasks", icon: CheckSquare },
  { label: "成长数据", href: "/analytics", icon: BarChart3 },
  { label: "社区对练", href: "/community", icon: Users },
  { label: "设置", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[220px] flex-col border-r border-border bg-surface">
      {/* Logo */}
      <div className="flex h-14 items-center px-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/logo.png" alt="CogniStack" className="h-8 w-8 rounded-sm" />
          <span className="text-base font-semibold text-text-primary">
            CogniStack
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary-light text-primary font-medium"
                  : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <p className="text-xs text-text-muted">CogniStack v0.1.0</p>
      </div>
    </aside>
  );
}
