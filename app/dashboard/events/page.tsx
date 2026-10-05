import Link from "next/link";
import { redirect } from "next/navigation";
import { ROLE_LABELS, type EventRole } from "@/lib/event-access";
import type { EventRow } from "@/lib/events";
import { formatShortDate } from "@/lib/time";
import { createClient } from "@/utils/supabase/server";

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ access?: string }> }) {
  const { access } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/login");

  const [{ data: ownedData, error: ownedError }, { data: memberRows }] = await Promise.all([
    supabase.from("events").select("*").eq("organizer_id", user.id),
    supabase.from("event_members").select("event_id,role").eq("user_id", user.id),
  ]);

  const roleByEvent = new Map<string, EventRole>();
  for (const m of memberRows ?? []) roleByEvent.set(m.event_id, m.role as EventRole);

  let memberEvents: EventRow[] = [];
  if (roleByEvent.size > 0) {
    const { data } = await supabase.from("events").select("*").in("id", [...roleByEvent.keys()]);
    memberEvents = (data ?? []) as EventRow[];
  }

  const items = [
    ...((ownedData ?? []) as EventRow[]).map((e) => ({ event: e, role: "owner" as EventRole })),
    ...memberEvents.map((e) => ({ event: e, role: roleByEvent.get(e.id)! })),
  ].sort((a, b) => a.event.start_at.localeCompare(b.event.start_at));
  const error = ownedError;

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-900">Your events</h1>
        </div>
        <Link
          href="/dashboard/events/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Create event
        </Link>
      </div>

      {access === "removed" && (
        <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          You no longer have access to this event.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not load your events. Please refresh and try again.
        </p>
      )}

      {!error && items.length === 0 && (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="mb-4 text-zinc-600">You haven&apos;t created an event yet.</p>
          <Link
            href="/dashboard/events/new"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Create event
          </Link>
        </div>
      )}

      <ul className="space-y-3">
        {items.map(({ event, role }) => {
          const admin = role === "owner" || role === "admin";
          return (
            <li key={event.id} className="flex items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-sm">
              <div className="min-w-0">
                <Link href={`/dashboard/events/${event.id}`} className="font-medium text-zinc-900 hover:underline">
                  {event.title}
                </Link>
                <p className="text-sm text-zinc-600">
                  {formatShortDate(event.start_at, event.timezone)}
                  {event.location ? ` · ${event.location}` : ""}
                </p>
                <p className="text-xs font-medium text-zinc-500">
                  <span className="capitalize">{event.status.replace("_", " ")}</span> · {ROLE_LABELS[role]}
                </p>
              </div>
              <div className="flex shrink-0 gap-3 text-sm">
                {role === "scanner" && (
                  <Link href={`/dashboard/events/${event.id}/check-in`} className="underline">
                    Open scanner
                  </Link>
                )}
                {admin && event.status === "published" && (
                  <Link href={`/e/${event.slug}`} className="underline">
                    View public page
                  </Link>
                )}
                {admin && (
                  <Link href={`/dashboard/events/${event.id}/edit`} className="underline">
                    Edit
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
