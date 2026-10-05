import { notFound } from "next/navigation";
import { EventNav } from "@/components/event-nav";
import { RegistrationConfig } from "@/components/registration-config";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";
import type { RegistrationField } from "@/lib/registration";

export default async function RegistrationSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, event, role } = await requireEventAccess(id, ADMIN_ROLES);
  if (!event) notFound();

  const { data: fieldRows } = await supabase
    .from("event_registration_fields")
    .select("*")
    .eq("event_id", id)
    .order("sort_order");
  const fields = (fieldRows ?? []) as RegistrationField[];

  return (
    <main className="mx-auto min-h-screen max-w-2xl space-y-6 px-4 py-10">
      <EventNav eventId={id} eventTitle={event.title} role={role} active="registration" />
      <h2 className="text-xl font-semibold text-zinc-900">Registration form</h2>
      <RegistrationConfig
        eventId={id}
        initialRequiresApproval={event.requires_approval}
        initialRequireB2b={event.require_b2b_data}
        initialFields={fields}
      />
    </main>
  );
}
