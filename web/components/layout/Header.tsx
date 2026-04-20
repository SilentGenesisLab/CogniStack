"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Moon, Sun, User, LogOut } from "lucide-react";

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

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

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

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-primary transition-colors hover:bg-blue-100"
          >
            <User className="h-[18px] w-[18px]" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 z-50 w-40 rounded-sm border border-border bg-surface py-1 shadow-lg">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
