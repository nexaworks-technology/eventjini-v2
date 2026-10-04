import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { EventRow } from "@/lib/events";
import { formatShortDate } from "@/lib/time";

export default async function EventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("organizer_id", user.id)
    .order("start_at", { ascending: true });
  const events = (data ?? []) as EventRow[];

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

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not load your events. Please refresh and try again.
        </p>
      )}

      {!error && events.length === 0 && (
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
        {events.map((event) => (
          <li key={event.id} className="flex items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-sm">
            <div className="min-w-0">
              <Link href={`/dashboard/events/${event.id}`} className="font-medium text-zinc-900 hover:underline">
                {event.title}
              </Link>
              <p className="text-sm text-zinc-600">
                {formatShortDate(event.start_at, event.timezone)}
                {event.location ? ` · ${event.location}` : ""}
              </p>
              <p className="text-xs font-medium capitalize text-zinc-500">{event.status.replace("_", " ")}</p>
            </div>
            <div className="flex shrink-0 gap-3 text-sm">
              {event.status === "published" && (
                <Link href={`/e/${event.slug}`} className="underline">
                  View public page
                </Link>
              )}
              <Link href={`/dashboard/events/${event.id}/edit`} className="underline">
                Edit
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
