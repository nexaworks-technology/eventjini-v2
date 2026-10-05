import { PageHeader } from "@/components/eventjini/page-header";
import { SettingsForm } from "@/components/settings-form";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";
import type { EventFormValues } from "@/lib/events";
import { getTimezones, utcToZoned } from "@/lib/time";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await requireEventAccess(id, ADMIN_ROLES);
  const start = utcToZoned(event.start_at, event.timezone);
  const end = utcToZoned(event.end_at, event.timezone);
  const initial: EventFormValues = {
    title: event.title, slug: event.slug, description: event.description ?? "", coverImageUrl: event.cover_image_url ?? "",
    location: event.location ?? "", startDate: start.date, startTime: start.time, endDate: end.date, endTime: end.time,
    timezone: event.timezone, capacity: event.capacity === null ? "" : String(event.capacity),
    requiresApproval: event.requires_approval, requireB2bData: event.require_b2b_data,
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <PageHeader level={2} title={"Settings"} description={<>Manage this event&apos;s details, cover image and branding.</>} />
      </div>
      <SettingsForm eventId={id} initial={initial} timezones={getTimezones()} coverUrl={event.cover_image_url} primary={event.primary_color} accent={event.accent_color} currency={event.currency} title={event.title} status={event.status} />
    </div>
  );
}
