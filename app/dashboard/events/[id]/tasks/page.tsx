import { EventNav } from "@/components/event-nav";
import { TaskBoard } from "@/components/task-board";
import { ADMIN_ROLES, requireEventAccess, TASK_READ_ROLES } from "@/lib/event-access";
import type { Task } from "./actions";

export default async function TasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, event, role } = await requireEventAccess(id, TASK_READ_ROLES);

  const { data } = await supabase
    .from("event_tasks")
    .select("id,title,description,status,sort_order")
    .eq("event_id", id)
    .order("sort_order");

  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-6 px-4 py-10">
      <EventNav eventId={id} eventTitle={event.title} role={role} active="tasks" />
      <h2 className="text-xl font-semibold text-zinc-900">Tasks</h2>
      <TaskBoard eventId={id} initialTasks={(data ?? []) as Task[]} canEdit={ADMIN_ROLES.includes(role)} />
    </main>
  );
}
