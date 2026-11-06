import { PageHeader } from "@/components/eventjini/page-header";
import { SettingsForm } from "@/components/settings-form";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";
import { eventToFormValues } from "@/lib/events";
import { getTimezones } from "@/lib/time";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await requireEventAccess(id, ADMIN_ROLES);
  const initial = eventToFormValues(event);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <PageHeader level={2} title={"Settings"} description={<>Manage this event&apos;s details, cover image and branding.</>} />
      </div>
      <SettingsForm eventId={id} initial={initial} timezones={getTimezones()} coverUrl={event.cover_image_url} primary={event.primary_color} accent={event.accent_color} currency={event.currency} title={event.title} status={event.status} />
    </div>
  );
}
