"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MarkdownEditor } from "@/components/ui/MarkdownEditor";
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
  GripVertical,
  MoreVertical,
  Copy,
  Eye,
  Clock,
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
  startAt: string;
  dueAt: string | null;
  completedAt: string | null;
  duration: number | null;
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
  const [listMenuId, setListMenuId] = useState<string | null>(null);
  const [listDetailId, setListDetailId] = useState<string | null>(null);
  const [listDragId, setListDragId] = useState<string | null>(null);
  const [listDropTarget, setListDropTarget] = useState<{ id: string; position: "before" | "after" } | null>(null);
  const listMenuRef = useRef<HTMLDivElement>(null);

  // Close list menu on outside click
  useEffect(() => {
    if (!listMenuId) return;
    const handler = (e: MouseEvent) => {
      if (listMenuRef.current && !listMenuRef.current.contains(e.target as Node)) {
        setListMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [listMenuId]);

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
      body: JSON.stringify({ name: newListName.trim(), sortOrder: lists.length }),
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

  const duplicateTask = async (task: Task) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: task.title + " (副本)",
        description: task.description,
        listId: task.listId,
        parentId: task.parentId,
        quadrant: task.quadrant,
        dueAt: task.dueAt,
      }),
    });
    if (res.ok) {
      fetchTasks();
      fetchLists();
    }
  };

  const deleteList = async (id: string) => {
    await fetch(`/api/tasks/lists/${id}`, { method: "DELETE" });
    if (selectedListId === id) setSelectedListId(null);
    fetchLists();
    fetchTasks();
  };

  const copyListName = (list: TaskList) => {
    navigator.clipboard.writeText(list.name);
  };

  const reorderLists = async (draggedId: string, targetId: string, position: "before" | "after") => {
    if (draggedId === targetId) return;
    const ordered = lists.map((l) => l.id);
    const fromIdx = ordered.indexOf(draggedId);
    ordered.splice(fromIdx, 1);
    let toIdx = ordered.indexOf(targetId);
    if (position === "after") toIdx += 1;
    ordered.splice(toIdx, 0, draggedId);
    await Promise.all(
      ordered.map((id, i) =>
        fetch(`/api/tasks/lists/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: i }),
        })
      )
    );
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

  // Reorder: move draggedId before or after targetId within same level
  const reorderTask = async (draggedId: string, targetId: string, position: "before" | "after") => {
    if (draggedId === targetId) return;
    // Find siblings list containing both tasks
    const findSiblings = (list: Task[]): Task[] | null => {
      const ids = list.map((t) => t.id);
      if (ids.includes(draggedId) && ids.includes(targetId)) return list;
      for (const t of list) {
        if (t.subtasks?.length) {
          const found = findSiblings(t.subtasks);
          if (found) return found;
        }
      }
      return null;
    };
    const siblings = findSiblings(tasks);
    if (!siblings) return;

    // Reorder in memory
    const ordered = siblings.map((t) => t.id);
    const fromIdx = ordered.indexOf(draggedId);
    ordered.splice(fromIdx, 1);
    let toIdx = ordered.indexOf(targetId);
    if (position === "after") toIdx += 1;
    ordered.splice(toIdx, 0, draggedId);

    // Batch update sortOrder
    await Promise.all(
      ordered.map((id, i) =>
        fetch(`/api/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: i }),
        })
      )
    );
    fetchTasks();
  };

  const allTaskCount = tasks.length;

  // Resizable divider state
  const [leftWidth, setLeftWidth] = useState(220);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(220);

  // Handle resize drag
  useEffect(() => {
    if (!isResizing) return;
    const onMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(160, Math.min(400, startWidthRef.current + diff));
      setLeftWidth(newWidth);
    };
    const onMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="flex -m-6" style={{ height: "calc(100% + 3rem)" }}>
      {/* ===== Left: Task Lists ===== */}
      <div className="flex-shrink-0 border-r border-border bg-surface flex flex-col" style={{ width: `${leftWidth}px` }}>
        <div className="p-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">清单</h2>
        </div>

        <div
          className="flex-1 overflow-y-auto py-1"
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setListDropTarget(null);
            }
          }}
        >
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
            <div key={list.id} className="relative">
              {/* Drop indicator before */}
              {listDropTarget?.id === list.id && listDropTarget.position === "before" && (
                <div className="h-0.5 bg-primary rounded mx-2" />
              )}
              <div
                className={`group flex w-full items-center justify-between px-1 py-2 text-sm transition-colors cursor-pointer ${
                  selectedListId === list.id
                    ? "bg-primary-light text-primary font-medium"
                    : "text-text-secondary hover:bg-surface-secondary"
                }`}
                onClick={() => setSelectedListId(list.id)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("list-id", list.id);
                  e.dataTransfer.effectAllowed = "move";
                  setListDragId(list.id);
                }}
                onDragEnd={() => {
                  setListDragId(null);
                  setListDropTarget(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!e.dataTransfer.types.includes("list-id")) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const midY = rect.top + rect.height / 2;
                  setListDropTarget({ id: list.id, position: e.clientY < midY ? "before" : "after" });
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const draggedId = e.dataTransfer.getData("list-id");
                  if (draggedId && draggedId !== list.id) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    reorderLists(draggedId, list.id, e.clientY < midY ? "before" : "after");
                  }
                  setListDropTarget(null);
                  setListDragId(null);
                }}
              >
                {/* Drag handle */}
                <div className={`flex-shrink-0 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-text-muted transition-opacity ${listDragId === list.id ? "opacity-100" : ""}`}>
                  <GripVertical className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0 px-1">
                  <div
                    className="h-3 w-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: list.color }}
                  />
                  <span className="truncate">{list.name}</span>
                </div>
                <span className="text-xs text-text-muted mr-1">
                  {list._count?.tasks ?? 0}
                </span>
                {/* More menu */}
                <div className="relative flex-shrink-0" ref={listMenuId === list.id ? listMenuRef : undefined}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setListMenuId(listMenuId === list.id ? null : list.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary transition-opacity p-0.5 rounded hover:bg-surface-secondary"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                  {listMenuId === list.id && (
                    <div className="absolute right-0 top-full mt-1 z-50 w-32 rounded-sm border border-border bg-surface shadow-lg py-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setListMenuId(null);
                          setListDetailId(list.id);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-text-primary hover:bg-surface-secondary"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        查看
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setListMenuId(null);
                          copyListName(list);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-text-primary hover:bg-surface-secondary"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        复制
                      </button>
                      <div className="my-1 border-t border-border" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setListMenuId(null);
                          deleteList(list.id);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        删除
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {/* Drop indicator after */}
              {listDropTarget?.id === list.id && listDropTarget.position === "after" && (
                <div className="h-0.5 bg-primary rounded mx-2" />
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-border px-2 py-2">
          {showNewList ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createList()}
                placeholder="清单名称"
                className="flex-1 min-w-0 rounded-sm border border-border bg-surface px-2 py-1 text-sm text-text-primary focus:border-primary focus:outline-none"
              />
              <button
                onClick={createList}
                className="rounded-sm bg-primary px-3 py-1 text-xs text-white hover:bg-primary-hover whitespace-nowrap flex-shrink-0"
              >
                确定
              </button>
              <button
                onClick={() => {
                  setShowNewList(false);
                  setNewListName("");
                }}
                className="rounded-sm px-1 py-1 text-text-muted hover:text-text-primary flex-shrink-0"
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

      {/* ===== Resizable Divider ===== */}
      <div
        className={`w-1.5 flex-shrink-0 cursor-col-resize transition-colors ${
          isResizing ? "bg-primary" : "bg-transparent hover:bg-primary/40"
        }`}
        style={{ marginLeft: "-3px", marginRight: "-3px", zIndex: 10 }}
        onMouseDown={(e) => {
          e.preventDefault();
          startXRef.current = e.clientX;
          startWidthRef.current = leftWidth;
          setIsResizing(true);
        }}
      />

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
              onDuplicateTask={duplicateTask}
              onReorder={reorderTask}
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

      {/* List Detail Modal */}
      {listDetailId && (
        <ListDetailModal
          listId={listDetailId}
          listName={lists.find((l) => l.id === listDetailId)?.name ?? ""}
          onClose={() => setListDetailId(null)}
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
  onDuplicateTask,
  onReorder,
}: {
  tasks: Task[];
  selectedTask: Task | null;
  onSelect: (t: Task) => void;
  onToggle: (t: Task) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onCreateSubtask: (parentId: string) => void;
  onUpdateTask: (id: string, data: Record<string, unknown>) => void;
  onDeleteTask: (id: string) => void;
  onDuplicateTask: (task: Task) => void;
  onReorder: (draggedId: string, targetId: string, position: "before" | "after") => void;
}) {
  const [dropTarget, setDropTarget] = useState<{ id: string; position: "before" | "after" } | null>(null);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted">
        <Check className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm">暂无任务</p>
      </div>
    );
  }

  return (
    <div
      className="space-y-0.5"
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDropTarget(null)}
      onDrop={() => setDropTarget(null)}
    >
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
          onDuplicateTask={onDuplicateTask}
          onReorder={onReorder}
          dropTarget={dropTarget}
          setDropTarget={setDropTarget}
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
  onDuplicateTask,
  onReorder,
  dropTarget,
  setDropTarget,
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
  onDuplicateTask: (task: Task) => void;
  onReorder: (draggedId: string, targetId: string, position: "before" | "after") => void;
  dropTarget: { id: string; position: "before" | "after" } | null;
  setDropTarget: (v: { id: string; position: "before" | "after" } | null) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showSubInput, setShowSubInput] = useState(false);
  const [subTitle, setSubTitle] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const meta = QUADRANT_META[task.quadrant];
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const isSelected = selectedTask?.id === task.id;

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const handleCreateSub = async () => {
    if (!subTitle.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: subTitle.trim(),
        parentId: task.id,
        listId: task.listId,
        quadrant: task.quadrant,
      }),
    });
    if (res.ok) {
      setSubTitle("");
      setShowSubInput(false);
      onCreateSubtask(task.id);
    }
  };

  const isDropBefore = dropTarget?.id === task.id && dropTarget.position === "before";
  const isDropAfter = dropTarget?.id === task.id && dropTarget.position === "after";

  return (
    <div>
      {/* Drop indicator — before */}
      {isDropBefore && (
        <div className="h-0.5 bg-primary rounded mx-2" />
      )}
      <div
        onClick={() => onSelect(task)}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const pos = e.clientY < midY ? "before" : "after";
          setDropTarget({ id: task.id, position: pos });
        }}
        onDragLeave={(e) => {
          // Only clear if leaving the element entirely
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDropTarget(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const draggedId = e.dataTransfer.getData("text/plain");
          if (draggedId && draggedId !== task.id) {
            const rect = e.currentTarget.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const pos = e.clientY < midY ? "before" : "after";
            onReorder(draggedId, task.id, pos);
          }
          setDropTarget(null);
        }}
        className={`group flex items-center gap-1.5 rounded-sm py-2 pr-2 cursor-pointer transition-colors ${
          isSelected
            ? "bg-primary-light border border-primary/20"
            : "bg-surface border border-transparent hover:bg-surface-secondary"
        }`}
        style={{ paddingLeft: `${4 + depth * 24}px` }}
      >
        {/* Drag handle — visible on hover */}
        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            onDragStart(e, task.id);
          }}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary transition-opacity"
          title="拖拽排序"
        >
          <GripVertical className="h-4 w-4" />
        </div>

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

        {/* More actions menu */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary transition-opacity p-0.5 rounded hover:bg-surface-secondary"
            title="更多操作"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 z-50 w-36 rounded-sm border border-border bg-surface shadow-lg py-1">
              {depth < 2 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    setShowSubInput(true);
                    setExpanded(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-text-primary hover:bg-surface-secondary transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  添加子任务
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onDuplicateTask(task);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-text-primary hover:bg-surface-secondary transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                创建副本
              </button>
              <div className="my-1 border-t border-border" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onDeleteTask(task.id);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                删除
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drop indicator — after */}
      {isDropAfter && !hasSubtasks && (
        <div className="h-0.5 bg-primary rounded mx-2" />
      )}

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
              onDuplicateTask={onDuplicateTask}
              onReorder={onReorder}
              dropTarget={dropTarget}
              setDropTarget={setDropTarget}
            />
          ))}
        </div>
      )}

      {/* Drop indicator — after (with subtasks) */}
      {isDropAfter && hasSubtasks && (
        <div className="h-0.5 bg-primary rounded mx-2" />
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
  const [descKey, setDescKey] = useState(task.id);
  const [subTitle, setSubTitle] = useState("");
  const [showSubInput, setShowSubInput] = useState(false);
  const titleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTitle(task.title);
    setDescKey(task.id);
  }, [task.id, task.title]);

  const saveTitle = (value: string) => {
    if (titleTimeout.current) clearTimeout(titleTimeout.current);
    titleTimeout.current = setTimeout(() => {
      onUpdate(task.id, { title: value });
    }, 500);
  };

  const saveDesc = (md: string) => {
    if (descTimeout.current) clearTimeout(descTimeout.current);
    descTimeout.current = setTimeout(() => {
      // Save description silently — don't trigger fetchTasks/setSelectedTask
      // to prevent stale server data from resetting the editor during image upload
      fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: md }),
      });
    }, 800);
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
        quadrant: task.quadrant,
      }),
    });
    if (res.ok) {
      setSubTitle("");
      setShowSubInput(false);
      onCreateSubtask(task.id);
    }
  };

  // Count all nested subtasks recursively
  const countSubs = (subs: Task[]): { done: number; total: number } => {
    let done = 0, total = 0;
    for (const s of subs) {
      total++;
      if (s.completedAt) done++;
      if (s.subtasks?.length) {
        const nested = countSubs(s.subtasks);
        done += nested.done;
        total += nested.total;
      }
    }
    return { done, total };
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
      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        {/* Title */}
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            saveTitle(e.target.value);
          }}
          className="w-full text-base font-medium text-text-primary bg-transparent border-none outline-none focus:ring-0 mb-4"
        />

        {/* Quadrant selector */}
        <div className="mb-4">
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

        {/* 所属清单 */}
        <div className="mb-4">
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

        {/* Start date */}
        <div className="mb-4">
          <label className="text-xs font-medium text-text-muted mb-1.5 block">
            开始时间
          </label>
          <input
            type="datetime-local"
            value={task.startAt ? task.startAt.slice(0, 16) : ""}
            onChange={(e) =>
              onUpdate(task.id, { startAt: e.target.value || null })
            }
            className="w-full rounded-sm border border-border bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none"
          />
        </div>

        {/* Due date */}
        <div className="mb-4">
          <label className="text-xs font-medium text-text-muted mb-1.5 block">
            截止日期
          </label>
          <input
            type="datetime-local"
            value={task.dueAt ? task.dueAt.slice(0, 16) : ""}
            onChange={(e) =>
              onUpdate(task.id, { dueAt: e.target.value || null })
            }
            className="w-full rounded-sm border border-border bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none"
          />
        </div>

        {/* Duration (完成用时) */}
        <div className="mb-4">
          <label className="text-xs font-medium text-text-muted mb-1.5 block">
            完成用时（分钟）
          </label>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-text-muted flex-shrink-0" />
            <input
              type="number"
              min="0"
              placeholder="填写用时"
              value={task.duration ?? ""}
              onChange={(e) => {
                const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
                onUpdate(task.id, { duration: val });
              }}
              className="flex-1 rounded-sm border border-border bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Subtasks (recursive, up to 3 levels) */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-text-muted">
              子任务
              {task.subtasks?.length > 0 && (() => {
                const c = countSubs(task.subtasks);
                return <span className="ml-1">({c.done}/{c.total})</span>;
              })()}
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
            <DetailSubtaskList
              subtasks={task.subtasks}
              depth={0}
              onToggle={onToggle}
              onDelete={onDelete}
              onCreateSubtask={onCreateSubtask}
              taskListId={task.listId}
              taskQuadrant={task.quadrant}
            />
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

        {/* Description — live Markdown editor (Tiptap) */}
        <div className="flex-1 flex flex-col min-h-0 mb-2">
          <label className="text-xs font-medium text-text-muted mb-1.5 block flex-shrink-0">
            描述
          </label>
          <MarkdownEditor
            key={descKey}
            content={task.description || ""}
            onChange={saveDesc}
            placeholder="添加描述..."
            className="flex-1"
          />
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

/* ---------- Detail Subtask List (recursive, max 3 levels) ---------- */
function DetailSubtaskList({
  subtasks,
  depth,
  onToggle,
  onDelete,
  onCreateSubtask,
  taskListId,
  taskQuadrant,
}: {
  subtasks: Task[];
  depth: number;
  onToggle: (t: Task) => void;
  onDelete: (id: string) => void;
  onCreateSubtask: (parentId: string) => void;
  taskListId: string | null;
  taskQuadrant: Quadrant;
}) {
  return (
    <div className="space-y-0.5 mb-2">
      {subtasks.map((sub) => (
        <DetailSubtaskItem
          key={sub.id}
          sub={sub}
          depth={depth}
          onToggle={onToggle}
          onDelete={onDelete}
          onCreateSubtask={onCreateSubtask}
          taskListId={taskListId}
          taskQuadrant={taskQuadrant}
        />
      ))}
    </div>
  );
}

/* ---------- List Detail Modal ---------- */
function ListDetailModal({
  listId,
  listName,
  onClose,
}: {
  listId: string;
  listName: string;
  onClose: () => void;
}) {
  const [stats, setStats] = useState<{
    totalTasks: number;
    completedTasks: number;
    totalDuration: number;
    createdAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/tasks/lists/${listId}`);
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalTasks: data.stats.totalTasks,
          completedTasks: data.stats.completedTasks,
          totalDuration: data.stats.totalDuration,
          createdAt: data.createdAt,
        });
      }
      setLoading(false);
    })();
  }, [listId]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} 分钟`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h} 小时 ${m} 分钟` : `${h} 小时`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-surface rounded-lg border border-border shadow-xl w-[380px] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-text-primary">{listName}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {loading ? (
            <p className="text-sm text-text-muted text-center py-6">加载中...</p>
          ) : stats ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">创建日期</span>
                <span className="text-sm text-text-primary">
                  {new Date(stats.createdAt).toLocaleDateString("zh-CN")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">任务总数</span>
                <span className="text-sm text-text-primary font-medium">{stats.totalTasks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">已完成</span>
                <span className="text-sm text-green-600 font-medium">{stats.completedTasks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">完成率</span>
                <span className="text-sm text-text-primary font-medium">
                  {stats.totalTasks > 0
                    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
                    : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">累计用时</span>
                <span className="text-sm text-text-primary font-medium">
                  {stats.totalDuration > 0 ? formatDuration(stats.totalDuration) : "暂无记录"}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-text-muted text-center py-6">加载失败</p>
          )}
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="rounded-sm bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-hover"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailSubtaskItem({
  sub,
  depth,
  onToggle,
  onDelete,
  onCreateSubtask,
  taskListId,
  taskQuadrant,
}: {
  sub: Task;
  depth: number;
  onToggle: (t: Task) => void;
  onDelete: (id: string) => void;
  onCreateSubtask: (parentId: string) => void;
  taskListId: string | null;
  taskQuadrant: Quadrant;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showInput, setShowInput] = useState(false);
  const [title, setTitle] = useState("");
  const hasChildren = sub.subtasks && sub.subtasks.length > 0;
  const canAddChild = depth < 1; // depth 0 = first-level sub, depth 1 = second-level, max 3 total levels

  const handleCreate = async () => {
    if (!title.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        parentId: sub.id,
        listId: taskListId,
        quadrant: taskQuadrant,
      }),
    });
    if (res.ok) {
      setTitle("");
      setShowInput(false);
      onCreateSubtask(sub.id);
    }
  };

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-surface-secondary group"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {/* Expand toggle */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center text-text-muted"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}

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

        {/* Subtask count */}
        {hasChildren && (
          <span className="text-xs text-text-muted">
            {sub.subtasks.filter((s) => s.completedAt).length}/{sub.subtasks.length}
          </span>
        )}

        {/* Add child */}
        {canAddChild && (
          <button
            onClick={() => {
              setShowInput(true);
              setExpanded(true);
            }}
            className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-primary transition-all"
            title="添加子任务"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}

        <button
          onClick={() => onDelete(sub.id)}
          className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-500 transition-all"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <DetailSubtaskList
          subtasks={sub.subtasks}
          depth={depth + 1}
          onToggle={onToggle}
          onDelete={onDelete}
          onCreateSubtask={onCreateSubtask}
          taskListId={taskListId}
          taskQuadrant={taskQuadrant}
        />
      )}

      {/* Inline input */}
      {showInput && (
        <div
          className="flex gap-1 py-1"
          style={{ paddingLeft: `${24 + (depth + 1) * 16}px`, paddingRight: 8 }}
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setShowInput(false);
                setTitle("");
              }
            }}
            placeholder="子任务标题"
            className="flex-1 rounded-sm border border-border bg-surface px-2 py-1 text-xs text-text-primary focus:border-primary focus:outline-none"
          />
          <button
            onClick={handleCreate}
            className="rounded-sm bg-primary px-1.5 py-0.5 text-xs text-white hover:bg-primary-hover"
          >
            确定
          </button>
        </div>
      )}
    </div>
  );
}
