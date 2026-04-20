"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Plus,
  List,
  Grid3X3,
  Check,
  ChevronDown,
  ChevronRight,
  Trash2,
  Calendar,
  X,
  Pencil,
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

  const fetchLists = useCallback(async () => {
    const res = await fetch("/api/tasks/lists");
    if (res.ok) setLists(await res.json());
  }, []);

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

  const createTask = async (parentId?: string) => {
    const title = parentId ? undefined : newTaskTitle.trim();
    if (!parentId && !title) return;

    const body: Record<string, unknown> = {
      title: title || "新子任务",
      listId: selectedListId,
    };
    if (parentId) body.parentId = parentId;

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      if (!parentId) setNewTaskTitle("");
      fetchTasks();
      fetchLists();
    }
  };

  const toggleComplete = async (task: Task) => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completedAt }),
    });
    if (res.ok) {
      const updated = await res.json();
      fetchTasks();
      if (selectedTask?.id === task.id) setSelectedTask(updated);
    }
  };

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

  const deleteTask = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (selectedTask?.id === id) setSelectedTask(null);
    fetchTasks();
    fetchLists();
  };

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

        <div className="flex-1 overflow-y-auto p-4">
          {viewMode === "list" ? (
            <ListView
              tasks={tasks}
              selectedTask={selectedTask}
              onSelect={setSelectedTask}
              onToggle={toggleComplete}
              onDragStart={handleDragStart}
              onCreateSubtask={(parentId) => createTask(parentId)}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
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
              onClick={() => createTask()}
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
          lists={lists}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onClose={() => setSelectedTask(null)}
          onCreateSubtask={(parentId) => createTask(parentId)}
          onToggle={toggleComplete}
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
  onCreateSubtask,
  onUpdateTask,
  onDeleteTask,
}: {
  tasks: Task[];
  selectedTask: Task | null;
  onSelect: (t: Task) => void;
  onToggle: (t: Task) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onCreateSubtask: (parentId: string) => void;
  onUpdateTask: (id: string, data: Record<string, unknown>) => void;
  onDeleteTask: (id: string) => void;
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
    <div className="space-y-0.5">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          depth={0}
          selectedTask={selectedTask}
          onSelect={onSelect}
          onToggle={onToggle}
          onDragStart={onDragStart}
          onCreateSubtask={onCreateSubtask}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
        />
      ))}
    </div>
  );
}

/* ---------- Task Row (recursive for subtasks) ---------- */
function TaskRow({
  task,
  depth,
  selectedTask,
  onSelect,
  onToggle,
  onDragStart,
  onCreateSubtask,
  onUpdateTask,
  onDeleteTask,
}: {
  task: Task;
  depth: number;
  selectedTask: Task | null;
  onSelect: (t: Task) => void;
  onToggle: (t: Task) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onCreateSubtask: (parentId: string) => void;
  onUpdateTask: (id: string, data: Record<string, unknown>) => void;
  onDeleteTask: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showSubInput, setShowSubInput] = useState(false);
  const [subTitle, setSubTitle] = useState("");
  const meta = QUADRANT_META[task.quadrant];
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const isSelected = selectedTask?.id === task.id;

  const handleCreateSub = async () => {
    if (!subTitle.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: subTitle.trim(),
        parentId: task.id,
        listId: task.listId,
      }),
    });
    if (res.ok) {
      setSubTitle("");
      setShowSubInput(false);
      onCreateSubtask(task.id);
    }
  };

  return (
    <div>
      <div
        draggable={depth === 0}
        onDragStart={(e) => depth === 0 && onDragStart(e, task.id)}
        onClick={() => onSelect(task)}
        className={`group flex items-center gap-2 rounded-sm px-3 py-2 cursor-pointer transition-colors ${
          isSelected
            ? "bg-primary-light border border-primary/20"
            : "bg-surface border border-transparent hover:bg-surface-secondary"
        }`}
        style={{ paddingLeft: `${12 + depth * 24}px` }}
      >
        {/* Expand/collapse toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className={`flex h-4 w-4 flex-shrink-0 items-center justify-center text-text-muted transition-transform ${
            hasSubtasks ? "visible" : "invisible"
          }`}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

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
          {depth === 0 && (
            <div className="flex items-center gap-2 mt-0.5">
              {task.list && (
                <span className="text-xs text-text-muted">
                  {task.list.name}
                </span>
              )}
              {task.dueAt && (
                <span className="flex items-center gap-1 text-xs text-text-muted">
                  <Calendar className="h-3 w-3" />
                  {new Date(task.dueAt).toLocaleDateString("zh-CN")}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Subtask count */}
        {hasSubtasks && (
          <span className="text-xs text-text-muted">
            {task.subtasks.filter((s) => s.completedAt).length}/
            {task.subtasks.length}
          </span>
        )}

        {/* Quadrant badge (top-level only) */}
        {depth === 0 && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}
          >
            {meta.label}
          </span>
        )}

        {/* Add subtask button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowSubInput(true);
            setExpanded(true);
          }}
          className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-text-muted hover:text-primary transition-all"
          title="添加子任务"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expanded subtasks */}
      {expanded && hasSubtasks && (
        <div>
          {task.subtasks.map((sub) => (
            <TaskRow
              key={sub.id}
              task={sub}
              depth={depth + 1}
              selectedTask={selectedTask}
              onSelect={onSelect}
              onToggle={onToggle}
              onDragStart={onDragStart}
              onCreateSubtask={onCreateSubtask}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
            />
          ))}
        </div>
      )}

      {/* Inline subtask input */}
      {showSubInput && (
        <div
          className="flex items-center gap-2 py-1.5 bg-surface"
          style={{ paddingLeft: `${36 + (depth + 1) * 24}px`, paddingRight: 12 }}
        >
          <input
            autoFocus
            value={subTitle}
            onChange={(e) => setSubTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateSub();
              if (e.key === "Escape") {
                setShowSubInput(false);
                setSubTitle("");
              }
            }}
            onBlur={() => {
              if (!subTitle.trim()) {
                setShowSubInput(false);
                setSubTitle("");
              }
            }}
            placeholder="添加子任务，Enter 确认，Esc 取消"
            className="flex-1 rounded-sm border border-border bg-surface px-2 py-1 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
        </div>
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
                  {task.subtasks?.length > 0 && (
                    <span className="text-xs text-text-muted ml-auto">
                      {task.subtasks.filter((s) => s.completedAt).length}/
                      {task.subtasks.length}
                    </span>
                  )}
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
  lists,
  onUpdate,
  onDelete,
  onClose,
  onCreateSubtask,
  onToggle,
}: {
  task: Task;
  lists: TaskList[];
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onCreateSubtask: (parentId: string) => void;
  onToggle: (t: Task) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description || "");
  const [editingDesc, setEditingDesc] = useState(false);
  const [subTitle, setSubTitle] = useState("");
  const [showSubInput, setShowSubInput] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTitle(task.title);
    setDesc(task.description || "");
    setEditingDesc(false);
  }, [task.id, task.title, task.description]);

  const saveField = (field: string, value: string) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      onUpdate(task.id, { [field]: value });
    }, 500);
  };

  const handleCreateSub = async () => {
    if (!subTitle.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: subTitle.trim(),
        parentId: task.id,
        listId: task.listId,
      }),
    });
    if (res.ok) {
      setSubTitle("");
      setShowSubInput(false);
      onCreateSubtask(task.id);
    }
  };

  return (
    <div className="w-[360px] flex-shrink-0 border-l border-border bg-surface flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(task)}
            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
              task.completedAt
                ? "border-green-500 bg-green-500 text-white"
                : "border-border hover:border-primary"
            }`}
          >
            {task.completedAt && <Check className="h-3 w-3" />}
          </button>
          <h3 className="text-sm font-semibold text-text-primary">任务详情</h3>
        </div>
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

        {/* 所属清单 (moved above due date) */}
        <div>
          <label className="text-xs font-medium text-text-muted mb-1.5 block">
            所属清单
          </label>
          <select
            value={task.listId || ""}
            onChange={(e) =>
              onUpdate(task.id, { listId: e.target.value || null })
            }
            className="w-full rounded-sm border border-border bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none"
          >
            <option value="">无</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
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

        {/* Subtasks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-text-muted">
              子任务
              {task.subtasks?.length > 0 && (
                <span className="ml-1">
                  ({task.subtasks.filter((s) => s.completedAt).length}/
                  {task.subtasks.length})
                </span>
              )}
            </label>
            <button
              onClick={() => setShowSubInput(true)}
              className="text-xs text-primary hover:text-primary-hover flex items-center gap-0.5"
            >
              <Plus className="h-3 w-3" />
              添加
            </button>
          </div>

          {task.subtasks?.length > 0 && (
            <div className="space-y-1 mb-2">
              {task.subtasks.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-surface-secondary group"
                >
                  <button
                    onClick={() => onToggle(sub)}
                    className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                      sub.completedAt
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    {sub.completedAt && <Check className="h-2.5 w-2.5" />}
                  </button>
                  <span
                    className={`flex-1 text-sm ${
                      sub.completedAt
                        ? "line-through text-text-muted"
                        : "text-text-primary"
                    }`}
                  >
                    {sub.title}
                  </span>
                  <button
                    onClick={() => onDelete(sub.id)}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-500 transition-all"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showSubInput && (
            <div className="flex gap-1">
              <input
                autoFocus
                value={subTitle}
                onChange={(e) => setSubTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateSub();
                  if (e.key === "Escape") {
                    setShowSubInput(false);
                    setSubTitle("");
                  }
                }}
                placeholder="子任务标题"
                className="flex-1 rounded-sm border border-border bg-surface px-2 py-1 text-sm text-text-primary focus:border-primary focus:outline-none"
              />
              <button
                onClick={handleCreateSub}
                className="rounded-sm bg-primary px-2 py-1 text-xs text-white hover:bg-primary-hover"
              >
                确定
              </button>
            </div>
          )}
        </div>

        {/* Description with Markdown */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-text-muted">描述</label>
            <button
              onClick={() => setEditingDesc(!editingDesc)}
              className="text-xs text-text-muted hover:text-primary flex items-center gap-0.5"
            >
              <Pencil className="h-3 w-3" />
              {editingDesc ? "预览" : "编辑"}
            </button>
          </div>

          {editingDesc ? (
            <textarea
              value={desc}
              onChange={(e) => {
                setDesc(e.target.value);
                saveField("description", e.target.value);
              }}
              placeholder="支持 Markdown 格式..."
              rows={12}
              className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none resize-y font-mono"
            />
          ) : desc ? (
            <div
              onClick={() => setEditingDesc(true)}
              className="rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text-primary cursor-text min-h-[120px] prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-a:text-primary"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{desc}</ReactMarkdown>
            </div>
          ) : (
            <div
              onClick={() => setEditingDesc(true)}
              className="rounded-sm border border-dashed border-border px-3 py-4 text-sm text-text-muted text-center cursor-pointer hover:border-primary hover:text-primary transition-colors min-h-[120px] flex items-center justify-center"
            >
              点击添加描述（支持 Markdown）
            </div>
          )}
        </div>
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
