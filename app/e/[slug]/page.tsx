import Link from "next/link";
import { notFound } from "next/navigation";
import { PageViewTracker } from "@/components/page-view-tracker";
import { getPublishedEvent, getViewerState } from "@/lib/public-event";
import { formatEventWhen } from "@/lib/time";
import { createClient } from "@/utils/supabase/server";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const event = await getPublishedEvent((await params).slug);
  return { title: event ? `${event.title} | EventJini` : "EventJini" };
}

export default async function PublicEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const event = await getPublishedEvent((await params).slug);
  if (!event) notFound();

  const when = formatEventWhen(event.start_at, event.end_at, event.timezone);
  const { soldOut, registration } = await getViewerState(event);

  const supabase = await createClient();
  const { data: sessionRows } = await supabase
    .from("event_sessions")
    .select("id,title,speaker,description,start_at,end_at")
    .eq("event_id", event.id)
    .order("start_at");
  const sessions = sessionRows ?? [];
  const { count: tierCount } = await supabase.from("sponsorship_tiers").select("id", { count: "exact", head: true }).eq("event_id", event.id);

  let cta: React.ReactNode;
  if (registration?.status === "approved" || registration?.status === "checked_in") {
    cta = (
      <div className="space-y-2">
        <p className="font-medium text-green-700">You&apos;re registered</p>
        <Link
          href={`/tickets/${registration.ticket_code}`}
          className="inline-block rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          View ticket
        </Link>
      </div>
    );
  } else if (registration?.status === "pending") {
    cta = (
      <div className="space-y-2">
        <p className="font-medium text-zinc-800">Application pending</p>
        <Link href="/my-tickets" className="inline-block rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">
          View My Tickets
        </Link>
      </div>
    );
  } else if (registration?.status === "rejected") {
    cta = <p className="font-medium text-zinc-800">Registration not approved</p>;
  } else if (registration?.status === "cancelled") {
    cta = <p className="font-medium text-zinc-800">Your registration was cancelled</p>;
  } else if (soldOut) {
    cta = <p className="text-lg font-semibold uppercase tracking-wide text-red-700">Sold out</p>;
  } else {
    cta = (
      <Link
        href={`/e/${event.slug}/register`}
        className="inline-block rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Register
      </Link>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <PageViewTracker eventId={event.id} />
      <div className="mx-auto max-w-3xl bg-white shadow-sm">
        {event.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.cover_image_url} alt="" className="h-56 w-full object-cover sm:h-72" />
        )}
        <div className="space-y-6 px-5 py-8 sm:px-10">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">{event.title}</h1>

          <div className="space-y-1 text-zinc-800">
            <p className="font-medium">{when.date}</p>
            <p>
              {when.time} <span className="text-zinc-500">({event.timezone})</span>
            </p>
            {event.location && <p>{event.location}</p>}
          </div>

          {event.description && (
            <p className="whitespace-pre-line leading-7 text-zinc-700">{event.description}</p>
          )}

          {event.capacity !== null && <p className="text-sm text-zinc-600">{event.capacity} {event.capacity === 1 ? "attendee" : "attendees"}</p>}

          {sessions.length > 0 && (
            <section className="space-y-3 border-t border-zinc-100 pt-6">
              <h2 className="text-lg font-semibold text-zinc-900">Agenda</h2>
              <ul className="space-y-4">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <p className="text-sm text-zinc-500">
                      {new Intl.DateTimeFormat("en-US", { timeZone: event.timezone, hour: "numeric", minute: "2-digit" }).format(new Date(s.start_at))}
                    </p>
                    <p className="font-medium text-zinc-900">{s.title}</p>
                    {s.speaker && <p className="text-sm text-zinc-700">{s.speaker}</p>}
                    {s.description && <p className="whitespace-pre-line text-sm text-zinc-600">{s.description}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="border-t border-zinc-100 pt-6">{cta}</div>

          {(tierCount ?? 0) > 0 && (
            <p className="text-sm text-zinc-600">
              Interested in sponsoring?{" "}
              <Link href={`/e/${event.slug}/sponsors`} className="font-medium text-zinc-900 underline">View sponsorship opportunities</Link>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
