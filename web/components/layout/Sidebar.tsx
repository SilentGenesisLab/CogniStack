"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  Brain,
  CheckSquare,
  BarChart3,
  Users,
  Settings,
  ChevronDown,
  Sparkles,
  FolderOpen,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
};

const navItems: NavItem[] = [
  { label: "今日概览", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "知识管理",
    href: "/knowledge",
    icon: BookOpen,
    children: [
      { label: "知识消化", href: "/digest", icon: Sparkles },
      { label: "知识管理", href: "/knowledge", icon: FolderOpen },
    ],
  },
  { label: "闪卡复盘", href: "/review", icon: Layers },
  { label: "认知训练", href: "/training", icon: Brain },
  { label: "任务清单", href: "/tasks", icon: CheckSquare },
  { label: "成长数据", href: "/analytics", icon: BarChart3 },
  { label: "社区对练", href: "/community", icon: Users },
  { label: "设置", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    // Auto-expand if current path is a child
    const init: Record<string, boolean> = {};
    navItems.forEach((item) => {
      if (item.children) {
        const isChildActive = item.children.some((c) => pathname === c.href);
        if (isChildActive) init[item.label] = true;
      }
    });
    return init;
  });

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

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
          const Icon = item.icon;

          if (item.children) {
            const isOpen = !!openMenus[item.label];
            const isChildActive = item.children.some((c) => pathname === c.href);

            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => toggleMenu(item.label)}
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors",
                    isChildActive
                      ? "text-primary font-medium"
                      : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    className={clsx(
                      "h-4 w-4 transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-3">
                    {item.children.map((child) => {
                      const isActive = pathname === child.href;
                      const ChildIcon = child.icon;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={clsx(
                            "flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm transition-colors",
                            isActive
                              ? "bg-primary-light text-primary font-medium"
                              : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                          )}
                        >
                          <ChildIcon className="h-4 w-4" />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive = pathname === item.href;
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
