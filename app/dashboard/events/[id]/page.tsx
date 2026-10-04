import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PublishButton } from "@/components/publish-button";
import type { EventRow } from "@/lib/events";
import { formatEventWhen } from "@/lib/time";
import { createClient } from "@/utils/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EventSummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ published?: string }>;
}) {
  const { id } = await params;
  const { published } = await searchParams;
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
  const when = formatEventWhen(event.start_at, event.end_at, event.timezone);
  const isPublished = event.status === "published";

  return (
    <main className="mx-auto min-h-screen max-w-2xl space-y-6 px-4 py-10">
      <Link href="/dashboard/events" className="text-sm text-zinc-500 hover:underline">
        ← Your events
      </Link>

      {published === "1" && isPublished && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">Your event is published.</p>
      )}

      <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{event.title}</h1>
          <p className="text-sm font-medium capitalize text-zinc-500">{event.status.replace("_", " ")}</p>
        </div>

        <div className="space-y-1 text-sm text-zinc-800">
          <p>{when.date}</p>
          <p>{when.time}</p>
          <p className="text-zinc-600">{event.timezone}</p>
          {event.location && <p>{event.location}</p>}
          {event.capacity !== null && <p>Capacity: {event.capacity}</p>}
        </div>

        {isPublished && (
          <div className="text-sm">
            <p className="text-zinc-500">Public URL:</p>
            <p className="font-medium text-zinc-900">/e/{event.slug}</p>
          </div>
        )}

        <div className="flex flex-wrap items-start gap-3">
          {isPublished && (
            <Link
              href={`/e/${event.slug}`}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              View event
            </Link>
          )}
          <Link
            href={`/dashboard/events/${event.id}/edit`}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Edit event
          </Link>
          {event.status === "draft" && <PublishButton eventId={event.id} />}
        </div>
      </div>
    </main>
  );
}
