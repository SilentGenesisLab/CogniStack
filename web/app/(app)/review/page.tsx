"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  CheckSquare,
  ArrowLeft,
  Layers,
  FileQuestion,
  ChevronDown,
} from "lucide-react";

/* ─── Types ─── */

interface DeckOption {
  id: string;
  title: string;
  _count: { cards: number };
}

interface StatsData {
  total: number;
  dueCount: number;
  mastery: Record<
    string,
    { count: number; ratio: number }
  >;
  decks: DeckOption[];
}

interface ReviewCard {
  id: string;
  front: string;
  back: string;
  stability: number;
  deck: { id: string; title: string };
}

interface ExamQuestion {
  id: number;
  type: "choice" | "fill" | "short";
  question: string;
  options?: string[];
  correctIndex?: number;
  answer?: string;
  keyPoints?: string[];
  explanation?: string;
}

interface GradeResult {
  id: number;
  type: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  correct: boolean;
  score: number;
  maxScore: number;
  explanation: string;
}

interface GradeData {
  totalScore: number;
  maxScore: number;
  percentage: number;
  results: GradeResult[];
}

/* ─── Constants ─── */

const RATINGS = [
  { value: 1, label: "忘了", sub: "明天再来", cls: "border-red-200 bg-red-50 text-red-600 hover:bg-red-100" },
  { value: 2, label: "模糊", sub: "3 天后", cls: "border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100" },
  { value: 3, label: "记得", sub: "约 2 周", cls: "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100" },
  { value: 4, label: "很熟", sub: "约 2 月", cls: "border-green-200 bg-green-50 text-green-600 hover:bg-green-100" },
];

const MASTERY_OPTIONS = [
  { value: "all", label: "全部", color: "text-text-secondary" },
  { value: "1", label: "忘了", color: "text-red-600" },
  { value: "2", label: "模糊", color: "text-orange-600" },
  { value: "3", label: "记得", color: "text-blue-600" },
  { value: "4", label: "很熟", color: "text-green-600" },
];

type Phase = "setup" | "review" | "review-done" | "exam-loading" | "exam" | "exam-grading" | "exam-result";

/* ─── Page ─── */

export default function ReviewPage() {
  // Setup state
  const [stats, setStats] = useState<StatsData | null>(null);
  const [selectedDecks, setSelectedDecks] = useState<string[]>([]);
  const [masteryFilter, setMasteryFilter] = useState("all");
  const [cardCount, setCardCount] = useState(20);
  const [reviewMode, setReviewMode] = useState<"due" | "all">("due");
  const [phase, setPhase] = useState<Phase>("setup");

  // Review state
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  // Exam state
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<number, string>>({});
  const [gradeData, setGradeData] = useState<GradeData | null>(null);
  const [examError, setExamError] = useState("");

  // Load stats on mount
  useEffect(() => {
    fetch("/api/review/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const toggleDeck = (deckId: string) => {
    setSelectedDecks((prev) =>
      prev.includes(deckId) ? prev.filter((d) => d !== deckId) : [...prev, deckId]
    );
  };

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedDecks.length > 0) params.set("deckIds", selectedDecks.join(","));
    if (masteryFilter !== "all") params.set("mastery", masteryFilter);
    params.set("limit", String(cardCount));
    params.set("mode", reviewMode);
    return params.toString();
  }, [selectedDecks, masteryFilter, cardCount, reviewMode]);

  /* ─── Start Review ─── */
  const startReview = async () => {
    setPhase("review");
    const res = await fetch(`/api/review/due?${buildQuery()}`);
    const data = await res.json();
    setCards(data.cards || []);
    setCurrent(0);
    setFlipped(false);
    setStartTime(Date.now());
    if (!data.cards?.length) setPhase("review-done");
  };

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
      setPhase("review-done");
    } else {
      setCurrent(next);
      setFlipped(false);
      setStartTime(Date.now());
    }
    setSubmitting(false);
  };

  /* ─── Start Exam ─── */
  const startExam = async () => {
    setPhase("exam-loading");
    setExamError("");
    setExamAnswers({});
    setGradeData(null);

    try {
      const res = await fetch("/api/review/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          deckIds: selectedDecks.length > 0 ? selectedDecks : undefined,
          count: Math.min(cardCount, 15),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExamError(data.error || "生成失败");
        setPhase("setup");
        return;
      }
      setExamQuestions(data.questions || []);
      setPhase("exam");
    } catch {
      setExamError("网络错误，请重试");
      setPhase("setup");
    }
  };

  const submitExam = async () => {
    setPhase("exam-grading");
    try {
      const res = await fetch("/api/review/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grade",
          questions: examQuestions,
          answers: examAnswers,
        }),
      });
      const data = await res.json();
      setGradeData(data);
      setPhase("exam-result");
    } catch {
      setPhase("exam");
    }
  };

  const goBack = () => {
    setPhase("setup");
    setCards([]);
    setCurrent(0);
    setFlipped(false);
    setExamQuestions([]);
    setExamAnswers({});
    setGradeData(null);
  };

  /* ─── Render ─── */

  // Setup screen
  if (phase === "setup") {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-text-primary">闪卡复盘</h1>

        {examError && (
          <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {examError}
          </div>
        )}

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: "总卡片", value: stats.total, color: "text-text-primary" },
              { label: "待复习", value: stats.dueCount, color: "text-primary" },
              { label: "忘了", value: stats.mastery.forgot?.count || 0, color: "text-red-600" },
              { label: "模糊", value: stats.mastery.fuzzy?.count || 0, color: "text-orange-600" },
              { label: "已掌握", value: (stats.mastery.remembered?.count || 0) + (stats.mastery.mastered?.count || 0), color: "text-green-600" },
            ].map((s) => (
              <Card key={s.label}>
                <p className="text-xs text-text-muted">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </Card>
            ))}
          </div>
        )}

        {/* Deck Selection */}
        <Card>
          <h2 className="mb-3 text-sm font-medium text-text-primary">选择卡组</h2>
          {stats?.decks && stats.decks.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedDecks([])}
                className={`rounded-sm border px-3 py-1.5 text-sm transition-colors ${
                  selectedDecks.length === 0
                    ? "border-primary bg-primary-light text-primary"
                    : "border-border text-text-secondary hover:border-primary"
                }`}
              >
                全部卡组
              </button>
              {stats.decks.map((d) => (
                <button
                  key={d.id}
                  onClick={() => toggleDeck(d.id)}
                  className={`rounded-sm border px-3 py-1.5 text-sm transition-colors ${
                    selectedDecks.includes(d.id)
                      ? "border-primary bg-primary-light text-primary"
                      : "border-border text-text-secondary hover:border-primary"
                  }`}
                >
                  {d.title}
                  <span className="ml-1 text-xs opacity-60">({d._count.cards})</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">暂无卡组，先去知识消化创建吧</p>
          )}
        </Card>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Mastery filter */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                掌握度筛选
              </label>
              <div className="relative">
                <select
                  value={masteryFilter}
                  onChange={(e) => setMasteryFilter(e.target.value)}
                  className="w-full appearance-none rounded-sm border border-border bg-surface py-2 pl-3 pr-8 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {MASTERY_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              </div>
            </div>

            {/* Card count */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                题目数量
              </label>
              <div className="relative">
                <select
                  value={cardCount}
                  onChange={(e) => setCardCount(parseInt(e.target.value))}
                  className="w-full appearance-none rounded-sm border border-border bg-surface py-2 pl-3 pr-8 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {[5, 10, 15, 20, 30, 50].map((n) => (
                    <option key={n} value={n}>{n} 张</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              </div>
            </div>

            {/* Review scope */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                复习范围
              </label>
              <div className="relative">
                <select
                  value={reviewMode}
                  onChange={(e) => setReviewMode(e.target.value as "due" | "all")}
                  className="w-full appearance-none rounded-sm border border-border bg-surface py-2 pl-3 pr-8 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="due">复盘复习（仅到期卡片）</option>
                  <option value="all">全面复习（全部卡片）</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              </div>
            </div>
          </div>
        </Card>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button onClick={startReview} className="flex-1" disabled={!stats?.total}>
            <Layers className="mr-2 h-4 w-4" />
            开始闪卡复习
          </Button>
          <Button
            onClick={startExam}
            variant="secondary"
            className="flex-1"
            disabled={!stats?.total}
          >
            <FileQuestion className="mr-2 h-4 w-4" />
            复盘考试
          </Button>
        </div>
      </div>
    );
  }

  // Review mode
  if (phase === "review") {
    if (cards.length === 0) {
      return (
        <div className="space-y-6">
          <button onClick={goBack} className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary">
            <ArrowLeft className="h-4 w-4" /> 返回设置
          </button>
          <Card>
            <div className="flex flex-col items-center py-14 text-center">
              <CheckSquare className="mb-3 h-10 w-10 text-text-muted" />
              <p className="font-medium text-text-primary">没有符合条件的卡片</p>
              <p className="mt-1 text-sm text-text-muted">试试调整筛选条件</p>
            </div>
          </Card>
        </div>
      );
    }

    const card = cards[current];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={goBack} className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary">
            <ArrowLeft className="h-4 w-4" /> 返回
          </button>
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

  // Review done
  if (phase === "review-done") {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-text-primary">闪卡复盘</h1>
        <Card>
          <div className="flex flex-col items-center py-14 text-center">
            <CheckSquare className="mb-3 h-10 w-10 text-green-500" />
            <p className="font-medium text-text-primary">
              {cards.length > 0
                ? `本轮完成！共复习 ${cards.length} 张`
                : "没有符合条件的待复习卡片"}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              {cards.length > 0 ? "继续保持" : "试试全面复习模式"}
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" onClick={goBack}>
                返回设置
              </Button>
              {cards.length > 0 && (
                <Button
                  onClick={() => {
                    setCurrent(0);
                    setFlipped(false);
                    setStartTime(Date.now());
                    setPhase("review");
                  }}
                >
                  再来一轮
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Exam loading
  if (phase === "exam-loading") {
    return (
      <div className="space-y-6">
        <button onClick={goBack} className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" /> 取消
        </button>
        <Card>
          <div className="flex flex-col items-center py-14 text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="font-medium text-text-primary">AI 正在生成考卷…</p>
            <p className="mt-1 text-sm text-text-muted">包含选择题、填空题、简答题</p>
          </div>
        </Card>
      </div>
    );
  }

  // Exam answering
  if (phase === "exam") {
    const answeredCount = Object.keys(examAnswers).filter((k) => examAnswers[Number(k)]?.trim()).length;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={goBack} className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary">
            <ArrowLeft className="h-4 w-4" /> 放弃考试
          </button>
          <span className="text-sm text-text-muted">
            已答 {answeredCount} / {examQuestions.length}
          </span>
        </div>

        <h1 className="text-xl font-semibold text-text-primary">复盘考试</h1>

        <div className="space-y-4">
          {examQuestions.map((q, idx) => (
            <Card key={q.id}>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary">
                  {idx + 1}
                </span>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-sm px-1.5 py-0.5 text-xs font-medium ${
                        q.type === "choice"
                          ? "bg-blue-50 text-blue-600"
                          : q.type === "fill"
                          ? "bg-orange-50 text-orange-600"
                          : "bg-purple-50 text-purple-600"
                      }`}
                    >
                      {q.type === "choice" ? "选择题" : q.type === "fill" ? "填空题" : "简答题"}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-text-primary">{q.question}</p>

                  {/* Choice options */}
                  {q.type === "choice" && q.options && (
                    <div className="space-y-2">
                      {q.options.map((opt, i) => (
                        <label
                          key={i}
                          className={`flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-2 text-sm transition-colors ${
                            examAnswers[q.id] === String(i)
                              ? "border-primary bg-primary-light text-primary"
                              : "border-border text-text-primary hover:bg-surface-secondary"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            value={i}
                            checked={examAnswers[q.id] === String(i)}
                            onChange={() =>
                              setExamAnswers((prev) => ({ ...prev, [q.id]: String(i) }))
                            }
                            className="sr-only"
                          />
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-current text-xs">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Fill input */}
                  {q.type === "fill" && (
                    <input
                      type="text"
                      placeholder="请填写答案"
                      value={examAnswers[q.id] || ""}
                      onChange={(e) =>
                        setExamAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      className="w-full rounded-sm border border-border bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  )}

                  {/* Short answer */}
                  {q.type === "short" && (
                    <textarea
                      placeholder="请输入你的回答"
                      rows={4}
                      value={examAnswers[q.id] || ""}
                      onChange={(e) =>
                        setExamAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      className="w-full resize-none rounded-sm border border-border bg-surface-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <Button onClick={submitExam} disabled={answeredCount === 0}>
            提交考卷（{answeredCount}/{examQuestions.length}）
          </Button>
        </div>
      </div>
    );
  }

  // Exam grading
  if (phase === "exam-grading") {
    return (
      <div className="space-y-6">
        <Card>
          <div className="flex flex-col items-center py-14 text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="font-medium text-text-primary">批改中…</p>
          </div>
        </Card>
      </div>
    );
  }

  // Exam result
  if (phase === "exam-result" && gradeData) {
    const scoreColor =
      gradeData.percentage >= 80
        ? "text-green-600"
        : gradeData.percentage >= 60
        ? "text-orange-600"
        : "text-red-600";

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-primary">考试结果</h1>
          <Button variant="secondary" onClick={goBack}>
            返回
          </Button>
        </div>

        {/* Score Card */}
        <Card>
          <div className="flex flex-col items-center py-8 text-center">
            <p className={`text-5xl font-bold ${scoreColor}`}>
              {gradeData.percentage}
              <span className="text-2xl">分</span>
            </p>
            <p className="mt-2 text-sm text-text-muted">
              {gradeData.totalScore} / {gradeData.maxScore} 分
            </p>
            <p className="mt-1 text-sm text-text-muted">
              {gradeData.percentage >= 80
                ? "优秀！知识掌握扎实"
                : gradeData.percentage >= 60
                ? "及格，还有提升空间"
                : "需要加强复习"}
            </p>
          </div>
        </Card>

        {/* Detailed Results */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-text-muted">详细解析</h2>
          {gradeData.results.map((r, idx) => (
            <Card
              key={r.id}
              className={`border-l-4 ${
                r.correct ? "border-l-green-500" : "border-l-red-500"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">
                      第 {idx + 1} 题
                    </span>
                    <span
                      className={`rounded-sm px-1.5 py-0.5 text-xs font-medium ${
                        r.type === "choice"
                          ? "bg-blue-50 text-blue-600"
                          : r.type === "fill"
                          ? "bg-orange-50 text-orange-600"
                          : "bg-purple-50 text-purple-600"
                      }`}
                    >
                      {r.type === "choice" ? "选择题" : r.type === "fill" ? "填空题" : "简答题"}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-medium ${r.correct ? "text-green-600" : "text-red-600"}`}
                  >
                    {r.score}/{r.maxScore}
                  </span>
                </div>

                <p className="text-sm text-text-primary">{r.question}</p>

                <div className="grid grid-cols-1 gap-2 rounded-sm bg-surface-secondary p-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-text-muted">你的答案</p>
                    <p className={r.correct ? "text-green-600" : "text-red-600"}>
                      {r.type === "choice"
                        ? `${String.fromCharCode(65 + parseInt(r.userAnswer || "0"))}. ${
                            examQuestions.find((q) => q.id === r.id)?.options?.[parseInt(r.userAnswer || "0")] || r.userAnswer
                          }`
                        : r.userAnswer || "（未作答）"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">正确答案</p>
                    <p className="text-green-600">{r.correctAnswer}</p>
                  </div>
                </div>

                {r.explanation && (
                  <div className="rounded-sm bg-blue-50 px-3 py-2">
                    <p className="text-xs text-blue-600">
                      <span className="font-medium">解析：</span>
                      {r.explanation}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={goBack} className="flex-1">
            返回设置
          </Button>
          <Button onClick={startExam} className="flex-1">
            再考一次
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
