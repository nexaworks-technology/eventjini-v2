import { PageHeader } from "@/components/eventjini/page-header";
import { TaskBoard } from "@/components/task-board";
import { ADMIN_ROLES, requireEventAccess, TASK_READ_ROLES } from "@/lib/event-access";
import type { Task } from "./actions";

export default async function TasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, role } = await requireEventAccess(id, TASK_READ_ROLES);

  const { data } = await supabase
    .from("event_tasks")
    .select("id,title,description,status,sort_order")
    .eq("event_id", id)
    .order("sort_order");

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader level={2} title={"Tasks"} />
      <TaskBoard eventId={id} initialTasks={(data ?? []) as Task[]} canEdit={ADMIN_ROLES.includes(role)} />
    </div>
  );
}
