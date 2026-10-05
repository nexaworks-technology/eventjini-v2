import Link from "next/link";
import { notFound } from "next/navigation";
import { RegistrationForm } from "@/components/registration-form";
import { getPublishedEvent, getViewerState } from "@/lib/public-event";
import type { RegistrationField } from "@/lib/registration";
import { formatEventWhen } from "@/lib/time";
import { createClient } from "@/utils/supabase/server";

export default async function RegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublishedEvent(slug);
  if (!event) notFound();

  const { soldOut, registration } = await getViewerState(event);
  const when = formatEventWhen(event.start_at, event.end_at, event.timezone);

  const supabase = await createClient();
  const { data } = await supabase
    .from("event_registration_fields")
    .select("*")
    .eq("event_id", event.id)
    .order("sort_order");
  const fields = (data ?? []) as RegistrationField[];

  let body: React.ReactNode;
  if (registration) {
    body = (
      <div className="space-y-3 text-center">
        <p className="text-zinc-800">You&apos;re already registered for this event.</p>
        <Link href="/my-tickets" className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
          View My Tickets
        </Link>
      </div>
    );
  } else if (soldOut) {
    body = <p className="text-center font-medium text-zinc-800">Sorry, this event is sold out.</p>;
  } else {
    body = (
      <RegistrationForm
        eventId={event.id}
        eventTitle={event.title}
        requireB2b={event.require_b2b_data}
        fields={fields}
      />
    );
  }

  return (
    <main className="flex min-h-screen items-start justify-center bg-zinc-50 px-4 py-10">
      <div className="w-full max-w-lg space-y-6 rounded-xl bg-white p-8 shadow-sm">
        <div className="space-y-1">
          <Link href={`/e/${event.slug}`} className="text-sm text-zinc-500 hover:underline">
            ← Event page
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-900">Register for {event.title}</h1>
          <p className="text-sm text-zinc-600">
            {when.date}
            {event.location ? ` • ${event.location}` : ""}
          </p>
        </div>
        {body}
      </div>
    </main>
  );
}
