"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  FileText,
  Link as LinkIcon,
  File,
  X,
  Sparkles,
  ChevronDown,
  Brain,
} from "lucide-react";

interface KnowledgeSeed {
  id: string;
  title: string;
  content: string;
  type: string;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  deck: { id: string; title: string; _count: { cards: number } } | null;
}

const TYPE_OPTIONS = [
  { value: "text", label: "文本", icon: FileText },
  { value: "url", label: "链接", icon: LinkIcon },
  { value: "file", label: "文件", icon: File },
];

function typeIcon(type: string) {
  const opt = TYPE_OPTIONS.find((t) => t.value === type);
  const Icon = opt?.icon || FileText;
  return <Icon className="h-4 w-4" />;
}

function typeLabel(type: string) {
  return TYPE_OPTIONS.find((t) => t.value === type)?.label || type;
}

export default function KnowledgePage() {
  const [seeds, setSeeds] = useState<KnowledgeSeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", type: "text", source: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Mastery stats
  const [masteryStats, setMasteryStats] = useState<{
    total: number;
    mastery: Record<string, { count: number; ratio: number }>;
  } | null>(null);

  const fetchSeeds = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge");
      const data = await res.json();
      if (res.ok) setSeeds(data.seeds);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSeeds(); }, [fetchSeeds]);

  useEffect(() => {
    fetch("/api/review/stats")
      .then((r) => r.json())
      .then((data) => setMasteryStats(data))
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ title: "", content: "", type: "text", source: "" });
    setError("");
    setShowModal(true);
  };

  const openEdit = (seed: KnowledgeSeed) => {
    setEditingId(seed.id);
    setForm({
      title: seed.title,
      content: seed.content,
      type: seed.type,
      source: seed.source || "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError("标题和内容不能为空");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = editingId ? `/api/knowledge/${editingId}` : "/api/knowledge";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "保存失败");
        return;
      }
      setShowModal(false);
      fetchSeeds();
    } catch {
      setError("网络错误");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
      setSeeds((prev) => prev.filter((s) => s.id !== id));
    } catch {
      /* ignore */
    }
    setDeletingId(null);
  };

  const filtered = seeds.filter((s) => {
    if (typeFilter !== "all" && s.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">知识管理</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          新建知识种子
        </Button>
      </div>

      {/* Mastery Stats */}
      {masteryStats && masteryStats.total > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium text-text-primary">掌握情况</h2>
            <span className="text-xs text-text-muted">共 {masteryStats.total} 张卡片</span>
          </div>

          {/* Progress bar */}
          <div className="mb-3 flex h-3 w-full overflow-hidden rounded-full bg-surface-secondary">
            {[
              { key: "mastered", color: "bg-green-500", label: "很熟" },
              { key: "remembered", color: "bg-blue-500", label: "记得" },
              { key: "fuzzy", color: "bg-orange-400", label: "模糊" },
              { key: "forgot", color: "bg-red-400", label: "忘了" },
              { key: "unlearned", color: "bg-gray-300", label: "未学" },
            ].map((item) => {
              const ratio = masteryStats.mastery[item.key]?.ratio || 0;
              if (ratio === 0) return null;
              return (
                <div
                  key={item.key}
                  className={`${item.color} transition-all`}
                  style={{ width: `${ratio * 100}%` }}
                  title={`${item.label}: ${masteryStats.mastery[item.key]?.count || 0}`}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {[
              { key: "mastered", label: "很熟", color: "bg-green-500" },
              { key: "remembered", label: "记得", color: "bg-blue-500" },
              { key: "fuzzy", label: "模糊", color: "bg-orange-400" },
              { key: "forgot", label: "忘了", color: "bg-red-400" },
              { key: "unlearned", label: "未学", color: "bg-gray-300" },
            ].map((item) => {
              const data = masteryStats.mastery[item.key];
              return (
                <div key={item.key} className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <span>{item.label}</span>
                  <span className="font-medium text-text-primary">{data?.count || 0}</span>
                  <span className="text-text-muted">
                    ({Math.round((data?.ratio || 0) * 100)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="搜索知识种子..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-sm border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="appearance-none rounded-sm border border-border bg-surface py-2 pl-3 pr-8 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">全部类型</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center text-sm text-text-muted">加载中...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">
              {seeds.length === 0 ? "还没有知识种子，点击右上角创建" : "没有匹配的结果"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((seed) => (
            <Card key={seed.id} className="group relative">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm bg-surface-secondary text-text-secondary">
                  {typeIcon(seed.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-text-primary truncate">
                      {seed.title}
                    </h3>
                    <span className="flex-shrink-0 rounded-sm bg-surface-secondary px-1.5 py-0.5 text-xs text-text-muted">
                      {typeLabel(seed.type)}
                    </span>
                    {seed.deck && (
                      <span className="flex flex-shrink-0 items-center gap-1 rounded-sm bg-primary-light px-1.5 py-0.5 text-xs text-primary">
                        <Sparkles className="h-3 w-3" />
                        已消化 · {seed.deck._count.cards} 张卡片
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-text-secondary">
                    {seed.content}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
                    <span>{new Date(seed.createdAt).toLocaleDateString("zh-CN")}</span>
                    {seed.source && <span>来源: {seed.source}</span>}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => openEdit(seed)}
                    className="rounded-sm p-1.5 text-text-muted hover:bg-surface-secondary hover:text-text-primary"
                    title="编辑"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletingId(seed.id)}
                    className="rounded-sm p-1.5 text-text-muted hover:bg-red-50 hover:text-red-500"
                    title="删除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Delete confirm */}
              {deletingId === seed.id && (
                <div className="mt-3 flex items-center gap-2 rounded-sm border border-red-200 bg-red-50 px-3 py-2">
                  <span className="text-sm text-red-600">确定要删除这条知识种子吗？</span>
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => setDeletingId(null)}
                      className="rounded-sm px-2 py-1 text-xs text-text-secondary hover:bg-surface"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => handleDelete(seed.id)}
                      className="rounded-sm bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                    >
                      删除
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      {seeds.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span>共 {seeds.length} 条知识种子</span>
          <span>{seeds.filter((s) => s.deck).length} 条已消化</span>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-[560px] rounded-sm border border-border bg-surface p-6 shadow-lg">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">
                {editingId ? "编辑知识种子" : "新建知识种子"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-sm p-1 text-text-muted hover:bg-surface-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <p className="mb-4 rounded-sm bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="space-y-4">
              <Input
                label="标题"
                placeholder="知识种子标题"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                  类型
                </label>
                <div className="flex gap-2">
                  {TYPE_OPTIONS.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setForm({ ...form, type: t.value })}
                        className={`flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-sm transition-colors ${
                          form.type === t.value
                            ? "border-primary bg-primary-light text-primary"
                            : "border-border text-text-secondary hover:border-primary"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Input
                label="来源（可选）"
                placeholder="URL、文件名、书名等"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                  内容
                </label>
                <textarea
                  className="w-full resize-none rounded-sm border border-border bg-surface-secondary px-3 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  rows={10}
                  placeholder="输入知识内容、文章、笔记……"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                />
                <p className="mt-1 text-xs text-text-muted">{form.content.length} 字</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                取消
              </Button>
              <Button onClick={handleSave} loading={saving}>
                {editingId ? "保存" : "创建"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
