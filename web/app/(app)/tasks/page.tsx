"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  List,
  Grid3X3,
  Check,
  ChevronRight,
  Trash2,
  Calendar,
  X,
} from "lucide-react";

/* ---------- types ---------- */
interface TaskList {
  id: string;
  name: string;
  color: string;
  _count?: { tasks: number };
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  quadrant: Quadrant;
  priority: number;
  dueAt: string | null;
  completedAt: string | null;
  sortOrder: number;
  listId: string | null;
  parentId: string | null;
  list: { id: string; name: string; color: string } | null;
  subtasks: Task[];
}

type Quadrant =
  | "URGENT_IMPORTANT"
  | "NOT_URGENT_IMPORTANT"
  | "URGENT_NOT_IMPORTANT"
  | "NOT_URGENT_NOT_IMPORTANT";

type ViewMode = "list" | "quadrant";

const QUADRANT_META: Record<
  Quadrant,
  { label: string; color: string; bg: string; border: string }
> = {
  URGENT_IMPORTANT: {
    label: "紧急且重要",
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
  },
  NOT_URGENT_IMPORTANT: {
    label: "重要不紧急",
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
  },
  URGENT_NOT_IMPORTANT: {
    label: "紧急不重要",
    color: "text-yellow-600",
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    border: "border-yellow-200 dark:border-yellow-800",
  },
  NOT_URGENT_NOT_IMPORTANT: {
    label: "不紧急不重要",
    color: "text-gray-500",
    bg: "bg-gray-50 dark:bg-gray-800/30",
    border: "border-gray-200 dark:border-gray-700",
  },
};

/* ---------- main page ---------- */
export default function TasksPage() {
  const [lists, setLists] = useState<TaskList[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [newListName, setNewListName] = useState("");
  const [showNewList, setShowNewList] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  /* fetch lists */
  const fetchLists = useCallback(async () => {
    const res = await fetch("/api/tasks/lists");
    if (res.ok) setLists(await res.json());
  }, []);

  /* fetch tasks */
  const fetchTasks = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedListId) params.set("listId", selectedListId);
    const res = await fetch(`/api/tasks?${params}`);
    if (res.ok) setTasks(await res.json());
  }, [selectedListId]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  /* create list */
  const createList = async () => {
    if (!newListName.trim()) return;
    const res = await fetch("/api/tasks/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newListName.trim() }),
    });
    if (res.ok) {
      setNewListName("");
      setShowNewList(false);
      fetchLists();
    }
  };

  /* create task */
  const createTask = async () => {
    if (!newTaskTitle.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTaskTitle.trim(),
        listId: selectedListId,
      }),
    });
    if (res.ok) {
      setNewTaskTitle("");
      fetchTasks();
      fetchLists();
    }
  };

  /* toggle complete */
  const toggleComplete = async (task: Task) => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completedAt }),
    });
    if (res.ok) {
      fetchTasks();
      if (selectedTask?.id === task.id) {
        const updated = await res.json();
        setSelectedTask(updated);
      }
    }
  };

  /* update task field */
  const updateTask = async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      fetchTasks();
      if (selectedTask?.id === id) setSelectedTask(updated);
    }
  };

  /* delete task */
  const deleteTask = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (selectedTask?.id === id) setSelectedTask(null);
    fetchTasks();
    fetchLists();
  };

  /* drag-drop for quadrant */
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, quadrant: Quadrant) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) updateTask(taskId, { quadrant });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const allTaskCount = tasks.length;

  return (
    <div className="flex h-full -m-6">
      {/* ===== Left: Task Lists ===== */}
      <div className="w-[220px] flex-shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="p-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">清单</h2>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {/* All tasks */}
          <button
            onClick={() => setSelectedListId(null)}
            className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors ${
              selectedListId === null
                ? "bg-primary-light text-primary font-medium"
                : "text-text-secondary hover:bg-surface-secondary"
            }`}
          >
            <div className="flex items-center gap-2">
              <List className="h-4 w-4" />
              <span>全部任务</span>
            </div>
            <span className="text-xs text-text-muted">{allTaskCount}</span>
          </button>

          {/* User lists */}
          {lists.map((list) => (
            <button
              key={list.id}
              onClick={() => setSelectedListId(list.id)}
              className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors ${
                selectedListId === list.id
                  ? "bg-primary-light text-primary font-medium"
                  : "text-text-secondary hover:bg-surface-secondary"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: list.color }}
                />
                <span>{list.name}</span>
              </div>
              <span className="text-xs text-text-muted">
                {list._count?.tasks ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* New list */}
        <div className="border-t border-border p-2">
          {showNewList ? (
            <div className="flex gap-1">
              <input
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createList()}
                placeholder="清单名称"
                className="flex-1 rounded-sm border border-border bg-surface px-2 py-1 text-sm text-text-primary focus:border-primary focus:outline-none"
              />
              <button
                onClick={createList}
                className="rounded-sm bg-primary px-2 py-1 text-xs text-white hover:bg-primary-hover"
              >
                确定
              </button>
              <button
                onClick={() => {
                  setShowNewList(false);
                  setNewListName("");
                }}
                className="rounded-sm px-1 py-1 text-text-muted hover:text-text-primary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewList(true)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-text-muted hover:bg-surface-secondary hover:text-text-primary transition-colors"
            >
              <Plus className="h-4 w-4" />
              新建清单
            </button>
          )}
        </div>
      </div>

      {/* ===== Middle: Task List ===== */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface-secondary">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <h2 className="text-base font-semibold text-text-primary">
            {selectedListId
              ? lists.find((l) => l.id === selectedListId)?.name ?? "任务"
              : "全部任务"}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-sm p-1.5 transition-colors ${
                viewMode === "list"
                  ? "bg-primary-light text-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
              title="列表视图"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("quadrant")}
              className={`rounded-sm p-1.5 transition-colors ${
                viewMode === "quadrant"
                  ? "bg-primary-light text-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
              title="四象限视图"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {viewMode === "list" ? (
            <ListView
              tasks={tasks}
              selectedTask={selectedTask}
              onSelect={setSelectedTask}
              onToggle={toggleComplete}
              onDragStart={handleDragStart}
            />
          ) : (
            <QuadrantView
              tasks={tasks}
              selectedTask={selectedTask}
              onSelect={setSelectedTask}
              onToggle={toggleComplete}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            />
          )}
        </div>

        {/* New task input */}
        <div className="border-t border-border bg-surface px-4 py-3">
          <div className="flex gap-2">
            <input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createTask()}
              placeholder="添加新任务，按 Enter 确认"
              className="flex-1 rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={createTask}
              className="rounded-sm bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ===== Right: Task Detail ===== */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}

/* ---------- List View ---------- */
function ListView({
  tasks,
  selectedTask,
  onSelect,
  onToggle,
  onDragStart,
}: {
  tasks: Task[];
  selectedTask: Task | null;
  onSelect: (t: Task) => void;
  onToggle: (t: Task) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted">
        <Check className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm">暂无任务</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          isSelected={selectedTask?.id === task.id}
          onSelect={onSelect}
          onToggle={onToggle}
          onDragStart={onDragStart}
        />
      ))}
    </div>
  );
}

/* ---------- Task Row ---------- */
function TaskRow({
  task,
  isSelected,
  onSelect,
  onToggle,
  onDragStart,
}: {
  task: Task;
  isSelected: boolean;
  onSelect: (t: Task) => void;
  onToggle: (t: Task) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}) {
  const meta = QUADRANT_META[task.quadrant];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => onSelect(task)}
      className={`group flex items-center gap-3 rounded-sm px-3 py-2.5 cursor-pointer transition-colors ${
        isSelected
          ? "bg-primary-light border border-primary/20"
          : "bg-surface border border-transparent hover:bg-surface-secondary"
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(task);
        }}
        className={`flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          task.completedAt
            ? "border-green-500 bg-green-500 text-white"
            : "border-border hover:border-primary"
        }`}
      >
        {task.completedAt && <Check className="h-3 w-3" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm truncate ${
            task.completedAt
              ? "line-through text-text-muted"
              : "text-text-primary"
          }`}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.list && (
            <span className="text-xs text-text-muted">{task.list.name}</span>
          )}
          {task.dueAt && (
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Calendar className="h-3 w-3" />
              {new Date(task.dueAt).toLocaleDateString("zh-CN")}
            </span>
          )}
        </div>
      </div>

      {/* Quadrant badge */}
      <span className={`text-xs px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>
        {meta.label}
      </span>

      {/* Subtask count */}
      {task.subtasks?.length > 0 && (
        <span className="flex items-center gap-0.5 text-xs text-text-muted">
          <ChevronRight className="h-3 w-3" />
          {task.subtasks.length}
        </span>
      )}
    </div>
  );
}

/* ---------- Quadrant View ---------- */
function QuadrantView({
  tasks,
  selectedTask,
  onSelect,
  onToggle,
  onDragStart,
  onDrop,
  onDragOver,
}: {
  tasks: Task[];
  selectedTask: Task | null;
  onSelect: (t: Task) => void;
  onToggle: (t: Task) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, q: Quadrant) => void;
  onDragOver: (e: React.DragEvent) => void;
}) {
  const quadrants: Quadrant[] = [
    "URGENT_IMPORTANT",
    "NOT_URGENT_IMPORTANT",
    "URGENT_NOT_IMPORTANT",
    "NOT_URGENT_NOT_IMPORTANT",
  ];

  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-3 h-full min-h-[400px]">
      {quadrants.map((q) => {
        const meta = QUADRANT_META[q];
        const qTasks = tasks.filter((t) => t.quadrant === q);

        return (
          <div
            key={q}
            onDrop={(e) => onDrop(e, q)}
            onDragOver={onDragOver}
            className={`rounded-md border ${meta.border} ${meta.bg} p-3 flex flex-col overflow-hidden transition-colors`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-sm font-medium ${meta.color}`}>
                {meta.label}
              </h3>
              <span className="text-xs text-text-muted">{qTasks.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {qTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, task.id)}
                  onClick={() => onSelect(task)}
                  className={`group flex items-center gap-2 rounded-sm px-2 py-1.5 cursor-pointer transition-colors ${
                    selectedTask?.id === task.id
                      ? "bg-white/80 dark:bg-gray-700/50 shadow-sm"
                      : "hover:bg-white/60 dark:hover:bg-gray-700/30"
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(task);
                    }}
                    className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                      task.completedAt
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-gray-400 hover:border-primary"
                    }`}
                  >
                    {task.completedAt && <Check className="h-2.5 w-2.5" />}
                  </button>
                  <span
                    className={`text-sm truncate ${
                      task.completedAt
                        ? "line-through text-text-muted"
                        : "text-text-primary"
                    }`}
                  >
                    {task.title}
                  </span>
                </div>
              ))}
              {qTasks.length === 0 && (
                <p className="text-xs text-text-muted py-4 text-center">
                  拖拽任务到此处
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Task Detail Panel ---------- */
function TaskDetail({
  task,
  onUpdate,
  onDelete,
  onClose,
}: {
  task: Task;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description || "");
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when task changes
  useEffect(() => {
    setTitle(task.title);
    setDesc(task.description || "");
  }, [task.id, task.title, task.description]);

  const saveField = (field: string, value: string) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      onUpdate(task.id, { [field]: value });
    }, 500);
  };

  return (
    <div className="w-[320px] flex-shrink-0 border-l border-border bg-surface flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">任务详情</h3>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title */}
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            saveField("title", e.target.value);
          }}
          className="w-full text-base font-medium text-text-primary bg-transparent border-none outline-none focus:ring-0"
        />

        {/* Quadrant selector */}
        <div>
          <label className="text-xs font-medium text-text-muted mb-1.5 block">
            象限
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(QUADRANT_META) as Quadrant[]).map((q) => {
              const meta = QUADRANT_META[q];
              return (
                <button
                  key={q}
                  onClick={() => onUpdate(task.id, { quadrant: q })}
                  className={`rounded-sm px-2 py-1.5 text-xs text-center transition-colors border ${
                    task.quadrant === q
                      ? `${meta.bg} ${meta.border} ${meta.color} font-medium`
                      : "border-transparent text-text-muted hover:bg-surface-secondary"
                  }`}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Due date */}
        <div>
          <label className="text-xs font-medium text-text-muted mb-1.5 block">
            截止日期
          </label>
          <input
            type="date"
            value={task.dueAt ? task.dueAt.slice(0, 10) : ""}
            onChange={(e) =>
              onUpdate(task.id, { dueAt: e.target.value || null })
            }
            className="w-full rounded-sm border border-border bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-text-muted mb-1.5 block">
            描述
          </label>
          <textarea
            value={desc}
            onChange={(e) => {
              setDesc(e.target.value);
              saveField("description", e.target.value);
            }}
            placeholder="添加任务描述..."
            rows={5}
            className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none resize-none"
          />
        </div>

        {/* List info */}
        {task.list && (
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">
              所属清单
            </label>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: task.list.color }}
              />
              {task.list.name}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <button
          onClick={() => onDelete(task.id)}
          className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          删除任务
        </button>
      </div>
    </div>
  );
}
