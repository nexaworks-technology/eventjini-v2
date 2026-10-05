"use client";

import { useConfirm } from "@/components/eventjini/confirm-dialog";
import { btnPrimarySm } from "@/components/eventjini/classes";
import { useState } from "react";
import {
  createTask,
  deleteTask,
  reorderTasks,
  updateTask,
  type Task,
  type TaskStatus,
} from "@/app/dashboard/events/[id]/tasks/actions";

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

function grouped(tasks: Task[]): Record<TaskStatus, Task[]> {
  const cols: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
  for (const t of [...tasks].sort((a, b) => a.sort_order - b.sort_order)) cols[t.status].push(t);
  return cols;
}

function applyMove(tasks: Task[], id: string, toStatus: TaskStatus, toIndex: number) {
  const moving = tasks.find((t) => t.id === id);
  if (!moving) return { next: tasks, changed: [] as Task[] };
  const cols = grouped(tasks.filter((t) => t.id !== id));
  const target = cols[toStatus];
  target.splice(Math.max(0, Math.min(toIndex, target.length)), 0, { ...moving, status: toStatus });

  const next: Task[] = [];
  for (const key of Object.keys(cols) as TaskStatus[]) {
    cols[key].forEach((t, i) => next.push({ ...t, sort_order: i }));
  }
  const before = new Map(tasks.map((t) => [t.id, t]));
  const changed = next.filter((t) => {
    const b = before.get(t.id);
    return !b || b.status !== t.status || b.sort_order !== t.sort_order;
  });
  return { next, changed };
}

export function TaskBoard({ eventId, initialTasks, canEdit }: { eventId: string; initialTasks: Task[]; canEdit: boolean }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", description: "" });
  const [dragId, setDragId] = useState<string | null>(null);

  const cols = grouped(tasks);

  async function move(id: string, toStatus: TaskStatus, toIndex: number) {
    const { next, changed } = applyMove(tasks, id, toStatus, toIndex);
    if (changed.length === 0) return;
    const previous = tasks;
    setTasks(next);
    setError(null);
    const r = await reorderTasks(eventId, changed.map((t) => ({ id: t.id, status: t.status, sort_order: t.sort_order })));
    if (!r.ok) {
      setTasks(previous);
      setError(r.error);
    }
  }

  async function add() {
    if (!newTitle.trim() || adding) return;
    setAdding(true);
    setError(null);
    const r = await createTask(eventId, newTitle, "");
    setAdding(false);
    if (!r.ok || !r.task) {
      setError(r.ok ? "Could not create the task." : r.error);
      return;
    }
    setTasks((t) => [...t, r.task!]);
    setNewTitle("");
  }

  async function saveEdit(id: string) {
    const r = await updateTask(eventId, id, draft.title, draft.description);
    if (!r.ok || !r.task) {
      setError(r.ok ? "Could not update the task." : r.error);
      return;
    }
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, title: r.task!.title, description: r.task!.description } : t)));
    setEditingId(null);
  }

  async function remove(id: string) {
    if (!await confirm({ title: "Delete this task?", destructive: true })) return;
    const r = await deleteTask(eventId, id);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setTasks((ts) => ts.filter((t) => t.id !== id));
  }

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {!canEdit && <p className="text-sm text-muted-foreground">You have read-only access to this board.</p>}

      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col, ci) => (
          <section
            key={col.key}
            aria-label={col.label}
            onDragOver={(e) => canEdit && e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (canEdit && dragId) void move(dragId, col.key, cols[col.key].length);
              setDragId(null);
            }}
            className="min-h-40 space-y-3 rounded-xl bg-muted p-3"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {col.label} <span className="text-muted-foreground">{cols[col.key].length}</span>
            </h3>

            {cols[col.key].map((t, i) => (
              <article
                key={t.id}
                draggable={canEdit}
                onDragStart={() => setDragId(t.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => canEdit && e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (canEdit && dragId && dragId !== t.id) void move(dragId, col.key, i);
                  setDragId(null);
                }}
                className={`space-y-2 rounded-lg bg-card p-3 shadow-sm ${canEdit ? "cursor-grab" : ""} ${dragId === t.id ? "opacity-50" : ""}`}
              >
                {editingId === t.id ? (
                  <div className="space-y-2">
                    <input
                      aria-label="Task title"
                      value={draft.title}
                      onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                      className="w-full rounded-md border border-border px-2 py-1 text-sm"
                    />
                    <textarea
                      aria-label="Task description"
                      value={draft.description}
                      onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                      rows={2}
                      className="w-full rounded-md border border-border px-2 py-1 text-sm"
                    />
                    <div className="flex gap-2 text-xs">
                      <button type="button" onClick={() => saveEdit(t.id)} className={btnPrimarySm}>Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="underline">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                    {t.description && <p className="whitespace-pre-line text-xs text-muted-foreground">{t.description}</p>}
                  </>
                )}

                {canEdit && editingId !== t.id && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <button type="button" aria-label={`Move ${t.title} up`} disabled={i === 0} onClick={() => move(t.id, col.key, i - 1)} className="rounded border border-border px-1.5 disabled:opacity-30">↑</button>
                    <button type="button" aria-label={`Move ${t.title} down`} disabled={i === cols[col.key].length - 1} onClick={() => move(t.id, col.key, i + 1)} className="rounded border border-border px-1.5 disabled:opacity-30">↓</button>
                    {ci > 0 && (
                      <button type="button" aria-label={`Move ${t.title} to ${COLUMNS[ci - 1].label}`} onClick={() => move(t.id, COLUMNS[ci - 1].key, cols[COLUMNS[ci - 1].key].length)} className="rounded border border-border px-1.5">← {COLUMNS[ci - 1].label}</button>
                    )}
                    {ci < COLUMNS.length - 1 && (
                      <button type="button" aria-label={`Move ${t.title} to ${COLUMNS[ci + 1].label}`} onClick={() => move(t.id, COLUMNS[ci + 1].key, cols[COLUMNS[ci + 1].key].length)} className="rounded border border-border px-1.5">{COLUMNS[ci + 1].label} →</button>
                    )}
                    <button type="button" onClick={() => { setEditingId(t.id); setDraft({ title: t.title, description: t.description ?? "" }); }} className="underline">Edit</button>
                    <button type="button" onClick={() => remove(t.id)} className="text-destructive underline">Delete</button>
                  </div>
                )}
              </article>
            ))}

            {canEdit && col.key === "todo" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void add();
                }}
                className="space-y-2"
              >
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="+ Add task"
                  aria-label="New task title"
                  className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm"
                />
                {newTitle.trim() && (
                  <button type="submit" disabled={adding} className={btnPrimarySm}>
                    {adding ? "Adding..." : "Add task"}
                  </button>
                )}
              </form>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
