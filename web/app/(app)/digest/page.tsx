"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface FlashCard {
  id: string;
  front: string;
  back: string;
}

interface SeedItem {
  id: string;
  title: string;
  content: string;
  status: "pending" | "processing" | "completed" | "failed";
  summary: string | null;
  keyPoints: string[];
  errorMessage: string | null;
  createdAt: string;
  deck: {
    id: string;
    title: string;
    cards: FlashCard[];
    _count: { cards: number };
  } | null;
}

interface PageData {
  seeds: SeedItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "等待中", color: "text-yellow-600", bg: "bg-yellow-50" },
  processing: { label: "消化中", color: "text-blue-600", bg: "bg-blue-50" },
  completed: { label: "已完成", color: "text-green-600", bg: "bg-green-50" },
  failed: { label: "失败", color: "text-red-600", bg: "bg-red-50" },
};

export default function DigestPage() {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSeeds = useCallback(async (p: number) => {
    try {
      const res = await fetch(`/api/digest?page=${p}&pageSize=20`);
      if (!res.ok) return;
      const data: PageData = await res.json();
      setPageData(data);
    } catch {
      // silent
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSeeds(page);
  }, [page, fetchSeeds]);

  // Poll when there are pending/processing seeds
  useEffect(() => {
    const hasPending = pageData?.seeds.some(
      (s) => s.status === "pending" || s.status === "processing"
    );
    if (hasPending) {
      pollRef.current = setInterval(() => fetchSeeds(page), 3000);
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pageData, page, fetchSeeds]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, title: title.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "提交失败");
        return;
      }
      setContent("");
      setTitle("");
      setPage(1);
      fetchSeeds(1);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async (seedId: string) => {
    try {
      const seed = pageData?.seeds.find((s) => s.id === seedId);
      if (!seed) return;
      const res = await fetch("/api/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: seed.content, title: seed.title }),
      });
      if (res.ok) fetchSeeds(page);
    } catch {
      // silent
    }
  };

  const seeds = pageData?.seeds || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">知识消化</h1>
      </div>

      {/* Input */}
      <Card>
        <div className="mb-3">
          <input
            type="text"
            className="w-full rounded-sm border border-border bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
            placeholder="标题（可选）"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
          />
        </div>
        <textarea
          className="w-full resize-none rounded-sm border border-border bg-surface-secondary px-3 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
          rows={6}
          placeholder="粘贴文章内容、笔记、会议记录…… AI 会自动生成知识卡片和摘要"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={submitting}
        />
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-text-muted">{content.length} 字</span>
          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={!content.trim()}
          >
            开始消化
          </Button>
        </div>
      </Card>

      {/* Seed Cards Grid */}
      {seeds.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-text-muted">
            消化记录 · 共 {pageData?.total || 0} 条
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {seeds.map((seed) => {
              const st = STATUS_MAP[seed.status] || STATUS_MAP.pending;
              const isExpanded = expandedId === seed.id;
              return (
                <div
                  key={seed.id}
                  className={`rounded-sm border bg-surface transition-all ${
                    isExpanded
                      ? "col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 border-primary"
                      : "border-border hover:border-primary/50 cursor-pointer"
                  }`}
                  style={{ borderColor: isExpanded ? "var(--primary)" : undefined }}
                  onClick={() => {
                    if (seed.status === "completed" || seed.status === "failed") {
                      setExpandedId(isExpanded ? null : seed.id);
                    }
                  }}
                >
                  {/* Card Header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium text-text-primary truncate">
                          {seed.title}
                        </h3>
                        <p className="mt-1 text-xs text-text-muted">
                          {new Date(seed.createdAt).toLocaleString("zh-CN")}
                        </p>
                      </div>
                      <span
                        className={`flex-shrink-0 rounded-sm px-2 py-0.5 text-xs font-medium ${st.bg} ${st.color}`}
                      >
                        {(seed.status === "pending" || seed.status === "processing") && (
                          <span className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent align-middle" />
                        )}
                        {st.label}
                        {seed.deck && ` · ${seed.deck._count.cards} 张卡片`}
                      </span>
                    </div>

                    {/* Preview - only when collapsed */}
                    {!isExpanded && seed.summary && (
                      <p className="mt-2 text-xs text-text-secondary line-clamp-2">
                        {seed.summary}
                      </p>
                    )}

                    {/* Failed - show error + retry */}
                    {!isExpanded && seed.status === "failed" && (
                      <div className="mt-2 flex items-center gap-2">
                        <p className="text-xs text-red-500">
                          {seed.errorMessage || "处理失败"}
                        </p>
                        <button
                          className="text-xs text-primary hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetry(seed.id);
                          }}
                        >
                          重试
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && seed.status === "completed" && (
                    <div className="border-t border-border p-4 space-y-4">
                      {/* Summary */}
                      {seed.summary && (
                        <div>
                          <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-text-muted">
                            核心摘要
                          </h4>
                          <p className="text-sm leading-relaxed text-text-primary">
                            {seed.summary}
                          </p>
                        </div>
                      )}

                      {/* Key Points */}
                      {seed.keyPoints.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
                            关键要点
                          </h4>
                          <ul className="space-y-1.5">
                            {seed.keyPoints.map((point, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-sm text-text-primary"
                              >
                                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary">
                                  {i + 1}
                                </span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Flashcards */}
                      {seed.deck && seed.deck.cards.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
                            知识卡片 · {seed.deck.cards.length} 张
                          </h4>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {seed.deck.cards.map((card) => (
                              <button
                                key={card.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFlipped((prev) => ({
                                    ...prev,
                                    [card.id]: !prev[card.id],
                                  }));
                                }}
                                className="min-h-[100px] rounded-sm border border-border bg-surface-secondary p-3 text-left transition-all hover:border-primary hover:shadow-sm"
                              >
                                {!flipped[card.id] ? (
                                  <div>
                                    <span className="mb-1.5 inline-block rounded-sm bg-primary-light px-1.5 py-0.5 text-xs font-medium text-primary">
                                      问
                                    </span>
                                    <p className="text-sm text-text-primary">
                                      {card.front}
                                    </p>
                                    <p className="mt-2 text-xs text-text-muted">
                                      点击翻转 →
                                    </p>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="mb-1.5 inline-block rounded-sm bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-600">
                                      答
                                    </span>
                                    <p className="text-sm text-text-primary">
                                      {card.back}
                                    </p>
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expanded Failed */}
                  {isExpanded && seed.status === "failed" && (
                    <div className="border-t border-border p-4">
                      <p className="text-sm text-red-500">
                        {seed.errorMessage || "处理失败，请重试"}
                      </p>
                      <button
                        className="mt-2 text-sm text-primary hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetry(seed.id);
                        }}
                      >
                        重新消化
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pageData && pageData.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-sm border border-border px-3 py-1.5 text-sm text-text-primary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span className="text-sm text-text-muted">
                {page} / {pageData.totalPages}
              </span>
              <button
                disabled={page >= pageData.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-sm border border-border px-3 py-1.5 text-sm text-text-primary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {seeds.length === 0 && pageData && (
        <div className="py-12 text-center text-sm text-text-muted">
          暂无消化记录，粘贴内容开始你的第一次知识消化
        </div>
      )}
    </div>
  );
}
