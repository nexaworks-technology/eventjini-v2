import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EventWizard } from "@/components/event-wizard";
import type { EventFormValues, EventRow } from "@/lib/events";
import { getTimezones, utcToZoned } from "@/lib/time";
import { createClient } from "@/utils/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("organizer_id", user.id)
    .maybeSingle();
  if (!data) notFound();
  const event = data as EventRow;

  const start = utcToZoned(event.start_at, event.timezone);
  const end = utcToZoned(event.end_at, event.timezone);
  const initialValues: EventFormValues = {
    title: event.title,
    slug: event.slug,
    description: event.description ?? "",
    coverImageUrl: event.cover_image_url ?? "",
    location: event.location ?? "",
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    timezone: event.timezone,
    capacity: event.capacity === null ? "" : String(event.capacity),
    requiresApproval: event.requires_approval,
    requireB2bData: event.require_b2b_data,
  };

  return (
    <main className="min-h-screen space-y-6 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href={`/dashboard/events/${event.id}`} className="text-sm text-zinc-500 hover:underline">
          ← {event.title}
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">Edit event</h1>
      </div>
      <EventWizard
        mode="edit"
        initialValues={initialValues}
        timezones={getTimezones()}
        eventId={event.id}
        isPublished={event.status === "published"}
      />
    </main>
  );
}
