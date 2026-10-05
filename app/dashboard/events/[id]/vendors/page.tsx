import { PageHeader } from "@/components/eventjini/page-header";
import { VendorManager, type Vendor } from "@/components/vendor-manager";
import { ADMIN_ROLES, requireEventAccess, TASK_READ_ROLES } from "@/lib/event-access";

export default async function VendorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, event, role } = await requireEventAccess(id, TASK_READ_ROLES);
  const { data } = await supabase
    .from("event_vendors")
    .select("id,name,category,contact_name,contact_email,contact_phone,cost,status,notes")
    .eq("event_id", id)
    .order("name");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <PageHeader level={2} title={"Vendors"} description={<>A directory of suppliers for this event. Costs are shown in {event.currency}.</>} />
      </div>
      <VendorManager eventId={id} vendors={((data ?? []) as Vendor[]).map((v) => ({ ...v, cost: Number(v.cost) }))} currency={event.currency} canEdit={ADMIN_ROLES.includes(role)} />
    </div>
  );
}
