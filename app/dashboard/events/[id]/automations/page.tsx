import { AutomationManager, type AutomationItem } from "@/components/automation-manager";
import { EventNav } from "@/components/event-nav";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";

type RunRow = {
  id: string;
  automation_id: string;
  qualified_at: string;
  status: string;
  result: string | null;
  registrations: { first_name: string; last_name: string } | null;
  email_deliveries: { status: string }[] | null;
};

export default async function AutomationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, event, role } = await requireEventAccess(id, ADMIN_ROLES);

  const [{ data: automations }, { data: runRows }] = await Promise.all([
    supabase.from("event_automations").select("id,name,trigger_type,subject,body_text,enabled").eq("event_id", id).order("created_at"),
    supabase
      .from("automation_runs")
      .select("id,automation_id,qualified_at,status,result,registrations(first_name,last_name),email_deliveries(status)")
      .eq("event_id", id)
      .order("qualified_at", { ascending: false })
      .limit(300),
  ]);

  const runs = (runRows ?? []) as unknown as RunRow[];
  const items: AutomationItem[] = (automations ?? []).map((a) => ({
    ...(a as Omit<AutomationItem, "runs">),
    runs: runs
      .filter((r) => r.automation_id === a.id)
      .slice(0, 20)
      .map((r) => ({
        id: r.id,
        who: r.registrations ? `${r.registrations.first_name} ${r.registrations.last_name}` : "Attendee",
        qualified_at: r.qualified_at,
        status: r.status,
        result: r.result,
        delivery: r.email_deliveries?.[0]?.status ?? null,
      })),
  }));

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-6 px-4 py-10">
      <EventNav eventId={id} eventTitle={event.title} role={role} active="automations" />
      <h2 className="text-xl font-semibold text-zinc-900">Automations</h2>
      <AutomationManager eventId={id} items={items} />
    </main>
  );
}
