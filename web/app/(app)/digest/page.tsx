"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface DigestCard {
  id: string;
  front: string;
  back: string;
}

interface DigestResult {
  deck: { id: string; title: string; cards: DigestCard[] };
  summary: string;
  key_points: string[];
}

export default function DigestPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DigestResult | null>(null);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  const handleDigest = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "处理失败");
        return;
      }
      setResult(data);
      setContent("");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">知识消化</h1>
      </div>

      {/* Input */}
      <Card>
        <label className="mb-2 block text-sm font-medium text-text-primary">
          粘贴文章或输入内容
        </label>
        <textarea
          className="w-full resize-none rounded-sm border border-border bg-surface-secondary px-3 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
          rows={8}
          placeholder="粘贴文章内容、笔记、会议记录…… AI 会自动生成知识卡片和摘要"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={loading}
        />
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-text-muted">{content.length} 字</span>
          <Button
            onClick={handleDigest}
            loading={loading}
            disabled={!content.trim()}
          >
            {loading ? "AI 分析中…" : "导入并分析"}
          </Button>
        </div>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              核心摘要
            </h2>
            <p className="text-sm leading-relaxed text-text-primary">
              {result.summary}
            </p>
          </Card>

          {/* Key Points */}
          <Card>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
              关键要点
            </h2>
            <ul className="space-y-2">
              {result.key_points.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-text-primary">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Flashcards */}
          <div>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
              知识卡片 · {result.deck.cards.length} 张 · 已保存至「{result.deck.title}」
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {result.deck.cards.map((card) => (
                <button
                  key={card.id}
                  onClick={() =>
                    setFlipped((prev) => ({ ...prev, [card.id]: !prev[card.id] }))
                  }
                  className="min-h-[120px] rounded-sm border border-border bg-surface p-4 text-left transition-all hover:border-primary hover:shadow-sm"
                >
                  {!flipped[card.id] ? (
                    <div>
                      <span className="mb-2 inline-block rounded-sm bg-primary-light px-1.5 py-0.5 text-xs font-medium text-primary">
                        问
                      </span>
                      <p className="text-sm text-text-primary">{card.front}</p>
                      <p className="mt-3 text-xs text-text-muted">点击翻转查看答案 →</p>
                    </div>
                  ) : (
                    <div>
                      <span className="mb-2 inline-block rounded-sm bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-600">
                        答
                      </span>
                      <p className="text-sm text-text-primary">{card.back}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
