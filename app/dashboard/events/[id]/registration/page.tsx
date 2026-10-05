import { PageHeader } from "@/components/eventjini/page-header";
import { notFound } from "next/navigation";
import { RegistrationConfig } from "@/components/registration-config";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";
import type { RegistrationField } from "@/lib/registration";

export default async function RegistrationSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, event } = await requireEventAccess(id, ADMIN_ROLES);
  if (!event) notFound();

  const { data: fieldRows } = await supabase
    .from("event_registration_fields")
    .select("*")
    .eq("event_id", id)
    .order("sort_order");
  const fields = (fieldRows ?? []) as RegistrationField[];

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader level={2} title={"Registration form"} />
      <RegistrationConfig
        eventId={id}
        initialRequiresApproval={event.requires_approval}
        initialRequireB2b={event.require_b2b_data}
        initialFields={fields}
      />
    </div>
  );
}
