"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CheckSquare } from "lucide-react";

interface ReviewCard {
  id: string;
  front: string;
  back: string;
  deck: { title: string };
}

const RATINGS = [
  { value: 1, label: "忘了", sub: "明天再来", cls: "border-red-200 bg-red-50 text-red-600 hover:bg-red-100" },
  { value: 2, label: "模糊", sub: "3 天后", cls: "border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100" },
  { value: 3, label: "记得", sub: "约 2 周", cls: "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100" },
  { value: 4, label: "很熟", sub: "约 2 月", cls: "border-green-200 bg-green-50 text-green-600 hover:bg-green-100" },
];

export default function ReviewPage() {
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  useEffect(() => {
    fetch("/api/review/due")
      .then((r) => r.json())
      .then((data) => {
        setCards(data.cards || []);
        setLoading(false);
      });
  }, []);

  const handleRate = async (rating: number) => {
    if (submitting) return;
    setSubmitting(true);

    await fetch("/api/review/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardId: cards[current].id,
        rating,
        timeSpent: Date.now() - startTime,
      }),
    });

    const next = current + 1;
    if (next >= cards.length) {
      setDone(true);
    } else {
      setCurrent(next);
      setFlipped(false);
      setStartTime(Date.now());
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-text-muted">
        加载中…
      </div>
    );
  }

  if (cards.length === 0 || done) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-text-primary">闪卡复盘</h1>
        <Card>
          <div className="flex flex-col items-center py-14 text-center">
            <CheckSquare className="mb-3 h-10 w-10 text-green-500" />
            <p className="font-medium text-text-primary">
              {done ? `本轮完成！共复习 ${cards.length} 张` : "今日复盘已全部完成 🎉"}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              {done ? "明天继续，连胜加油 🔥" : "没有待复习的卡片，先去导入知识吧"}
            </p>
            {done && (
              <Button
                className="mt-6"
                onClick={() => {
                  setCurrent(0);
                  setFlipped(false);
                  setDone(false);
                  setStartTime(Date.now());
                }}
              >
                再来一轮
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  const card = cards[current];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">闪卡复盘</h1>
        <span className="text-sm text-text-muted">
          {current + 1} / {cards.length}
        </span>
      </div>

      {/* Progress */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary">
        <div
          className="h-1.5 rounded-full bg-primary transition-all duration-300"
          style={{ width: `${(current / cards.length) * 100}%` }}
        />
      </div>

      {/* Card */}
      <div className="mx-auto max-w-2xl space-y-3">
        <div
          onClick={!flipped ? () => setFlipped(true) : undefined}
          className={`min-h-[260px] rounded-sm border border-border bg-surface p-8 transition-all ${
            !flipped ? "cursor-pointer hover:border-primary hover:shadow-sm" : ""
          }`}
        >
          <p className="mb-4 text-xs text-text-muted">{card.deck.title}</p>

          {!flipped ? (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <span className="mb-4 inline-block rounded-sm bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                问题
              </span>
              <p className="text-lg font-medium leading-relaxed text-text-primary">
                {card.front}
              </p>
              <p className="mt-8 text-sm text-text-muted">点击翻转查看答案</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="border-b border-border pb-4">
                <p className="mb-1 text-xs text-text-muted">问题</p>
                <p className="font-medium text-text-primary">{card.front}</p>
              </div>
              <div>
                <span className="mb-2 inline-block rounded-sm bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600">
                  答案
                </span>
                <p className="leading-relaxed text-text-primary">{card.back}</p>
              </div>
            </div>
          )}
        </div>

        {/* Rating buttons */}
        {flipped && (
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                onClick={() => handleRate(r.value)}
                disabled={submitting}
                className={`rounded-sm border py-3 text-sm font-medium transition-colors disabled:opacity-50 ${r.cls}`}
              >
                <div>{r.label}</div>
                <div className="mt-0.5 text-xs opacity-70">{r.sub}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
