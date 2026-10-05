import { PageHeader } from "@/components/eventjini/page-header";
import { BudgetManager, type BudgetItem } from "@/components/budget-manager";
import { ADMIN_ROLES, requireEventAccess, TASK_READ_ROLES } from "@/lib/event-access";

export default async function BudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, event, role } = await requireEventAccess(id, TASK_READ_ROLES);

  const { data } = await supabase
    .from("event_budget_items")
    .select("id,category,name,estimated_amount,actual_amount,notes")
    .eq("event_id", id)
    .order("category")
    .order("created_at");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <PageHeader level={2} title={"Budget"} description={<>Variance = actual − estimated. A positive number means over budget. Amounts are in {event.currency}.</>} />
      </div>
      <BudgetManager eventId={id} items={((data ?? []) as BudgetItem[]).map((i) => ({ ...i, estimated_amount: Number(i.estimated_amount), actual_amount: Number(i.actual_amount) }))} currency={event.currency} canEdit={ADMIN_ROLES.includes(role)} />
    </div>
  );
}
