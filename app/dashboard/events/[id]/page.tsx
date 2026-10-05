import Link from "next/link";
import { EventNav } from "@/components/event-nav";
import { PublishButton } from "@/components/publish-button";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";
import { formatEventWhen } from "@/lib/time";

export default async function EventOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ published?: string; denied?: string }>;
}) {
  const { id } = await params;
  const { published, denied } = await searchParams;
  const { supabase, event, role } = await requireEventAccess(id);

  const when = formatEventWhen(event.start_at, event.end_at, event.timezone);
  const isPublished = event.status === "published";
  const isAdmin = ADMIN_ROLES.includes(role);

  const { data: sessions } = await supabase
    .from("event_sessions")
    .select("id,title,speaker,start_at,end_at")
    .eq("event_id", id)
    .order("start_at")
    .limit(6);

  return (
    <main className="mx-auto min-h-screen max-w-2xl space-y-6 px-4 py-10">
      <EventNav eventId={id} eventTitle={event.title} role={role} active="overview" />

      {denied === "1" && (
        <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          You don&apos;t have access to that page for this event.
        </p>
      )}
      {published === "1" && isPublished && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">Your event is published.</p>
      )}

      {role === "scanner" && (
        <Link
          href={`/dashboard/events/${id}/check-in`}
          className="block rounded-xl bg-zinc-900 px-6 py-5 text-center text-lg font-medium text-white hover:bg-zinc-700"
        >
          Start check-in
        </Link>
      )}

      <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm font-medium capitalize text-zinc-500">{event.status.replace("_", " ")}</p>

        <div className="space-y-1 text-sm text-zinc-800">
          <p>{when.date}</p>
          <p>{when.time}</p>
          <p className="text-zinc-600">{event.timezone}</p>
          {event.location && <p>{event.location}</p>}
          {event.capacity !== null && <p>Capacity: {event.capacity}</p>}
        </div>

        {isPublished && isAdmin && (
          <div className="text-sm">
            <p className="text-zinc-500">Public URL:</p>
            <p className="font-medium text-zinc-900">/e/{event.slug}</p>
          </div>
        )}

        {isAdmin && (
          <div className="flex flex-wrap items-start gap-3">
            {isPublished && (
              <Link href={`/e/${event.slug}`} className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
                View event
              </Link>
            )}
            <Link href={`/dashboard/events/${event.id}/edit`} className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50">
              Edit event
            </Link>
            {event.status === "draft" && <PublishButton eventId={event.id} />}
          </div>
        )}
      </div>

      {(sessions?.length ?? 0) > 0 && (
        <section className="space-y-2 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-zinc-900">Agenda</h2>
          <ul className="space-y-2 text-sm">
            {sessions!.map((s) => (
              <li key={s.id}>
                <span className="text-zinc-500">{formatEventWhen(s.start_at, s.end_at, event.timezone).time}</span>{" "}
                <span className="font-medium text-zinc-900">{s.title}</span>
                {s.speaker && <span className="text-zinc-600"> · {s.speaker}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
