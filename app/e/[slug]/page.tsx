import { notFound } from "next/navigation";
import type { EventRow } from "@/lib/events";
import { SLUG_RE } from "@/lib/slug";
import { formatEventWhen } from "@/lib/time";
import { createClient } from "@/utils/supabase/server";

async function getPublishedEvent(slug: string) {
  if (!SLUG_RE.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return (data as EventRow | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const event = await getPublishedEvent((await params).slug);
  return { title: event ? `${event.title} | EventJini` : "EventJini" };
}

export default async function PublicEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const event = await getPublishedEvent((await params).slug);
  if (!event) notFound();

  const when = formatEventWhen(event.start_at, event.end_at, event.timezone);

  return (
    <main className="min-h-screen bg-zinc-50">
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

          {event.capacity !== null && <p className="text-sm text-zinc-600">Capacity: {event.capacity}</p>}
        </div>
      </div>
    </main>
  );
}
