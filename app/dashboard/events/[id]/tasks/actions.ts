"use server";

import { ADMIN_ROLES, authorizeAction } from "@/lib/event-access";
import { UUID_RE } from "@/lib/registration";

export type TaskStatus = "todo" | "in_progress" | "done";
export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  sort_order: number;
};
export type TaskResult = { ok: true; task?: Task } | { ok: false; error: string };

const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

export async function createTask(eventId: string, title: string, description: string): Promise<TaskResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  const t = title.trim();
  if (!t) return { ok: false, error: "Task title is required." };
  if (t.length > 200) return { ok: false, error: "Task title must be 200 characters or fewer." };

  const { data: last } = await auth.supabase
    .from("event_tasks")
    .select("sort_order")
    .eq("event_id", eventId)
    .eq("status", "todo")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await auth.supabase
    .from("event_tasks")
    .insert({
      event_id: eventId,
      title: t,
      description: description.trim() || null,
      status: "todo",
      sort_order: (last?.sort_order ?? -1) + 1,
      created_by: auth.userId,
    })
    .select("id,title,description,status,sort_order")
    .single();
  if (error || !data) return { ok: false, error: "Could not create the task. Please try again." };
  return { ok: true, task: data as Task };
}

export async function updateTask(eventId: string, taskId: string, title: string, description: string): Promise<TaskResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!UUID_RE.test(taskId)) return { ok: false, error: "Task not found." };
  const t = title.trim();
  if (!t) return { ok: false, error: "Task title is required." };

  const { data, error } = await auth.supabase
    .from("event_tasks")
    .update({ title: t, description: description.trim() || null })
    .eq("id", taskId)
    .eq("event_id", eventId)
    .select("id,title,description,status,sort_order")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Could not update the task." };
  return { ok: true, task: data as Task };
}

export async function deleteTask(eventId: string, taskId: string): Promise<TaskResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!UUID_RE.test(taskId)) return { ok: false, error: "Task not found." };

  const { data, error } = await auth.supabase
    .from("event_tasks")
    .delete()
    .eq("id", taskId)
    .eq("event_id", eventId)
    .select("id");
  if (error || !data || data.length === 0) return { ok: false, error: "Could not delete the task." };
  return { ok: true };
}

export async function reorderTasks(
  eventId: string,
  items: { id: string; status: TaskStatus; sort_order: number }[]
): Promise<TaskResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (items.length > 500) return { ok: false, error: "Too many tasks." };
  for (const i of items) {
    if (!UUID_RE.test(i.id) || !STATUSES.includes(i.status) || !Number.isInteger(i.sort_order) || i.sort_order < 0) {
      return { ok: false, error: "Invalid task update." };
    }
  }
  const { error } = await auth.supabase.rpc("reorder_event_tasks", { p_event_id: eventId, p_updates: items });
  if (error) return { ok: false, error: "Could not save the new order. Please try again." };
  return { ok: true };
}
