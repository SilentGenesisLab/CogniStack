"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Moon, Sun, User } from "lucide-react";

const pathLabels: Record<string, string> = {
  "/dashboard": "今日概览",
  "/digest": "知识消化",
  "/review": "闪卡复盘",
  "/training": "认知训练",
  "/tasks": "任务清单",
  "/analytics": "成长数据",
  "/community": "社区对练",
  "/settings": "设置",
};

export function Header() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const currentLabel = pathLabels[pathname] || "";

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-text-muted">CogniStack</span>
        {currentLabel && (
          <>
            <span className="text-text-muted">/</span>
            <span className="font-medium text-text-primary">
              {currentLabel}
            </span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-sm text-text-secondary hover:bg-surface-secondary transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <Moon className="h-[18px] w-[18px]" />
          ) : (
            <Sun className="h-[18px] w-[18px]" />
          )}
        </button>

        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-primary">
          <User className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
}
