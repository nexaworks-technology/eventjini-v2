import { PageHeader } from "@/components/eventjini/page-header";
import { EventWizard } from "@/components/event-wizard";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";
import { eventToFormValues } from "@/lib/events";
import { getTimezones } from "@/lib/time";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await requireEventAccess(id, ADMIN_ROLES);

  const initialValues = eventToFormValues(event);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader level={2} title="Edit event" description="Changes use the same validation as event creation." />
      <EventWizard
        mode="edit"
        initialValues={initialValues}
        timezones={getTimezones()}
        eventId={event.id}
        isPublished={event.status === "published"}
      />
    </div>
  );
}
