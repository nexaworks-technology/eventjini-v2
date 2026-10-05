import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PoweredBy } from "@/components/eventjini/public-event-chrome";
import { RegistrationForm } from "@/components/registration-form";
import { eventBrandStyle } from "@/lib/branding";
import { getPublishedEvent, getViewerState } from "@/lib/public-event";
import type { RegistrationField } from "@/lib/registration";
import { formatEventWhen } from "@/lib/time";
import { createClient } from "@/utils/supabase/server";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const event = await getPublishedEvent((await params).slug);
  return { title: event ? `Register · ${event.title}` : "Event not found" };
}

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
      <div className="space-y-3 rounded-xl border bg-card p-6 text-center">
        <p>You&apos;re already registered for this event.</p>
        <Link href="/my-tickets" className="event-cta inline-flex h-11 items-center rounded-lg px-5 text-sm font-semibold">
          View My Tickets
        </Link>
      </div>
    );
  } else if (soldOut) {
    body = <p className="rounded-xl border bg-card p-6 text-center font-medium">Sorry, this event is sold out.</p>;
  } else {
    body = <RegistrationForm eventId={event.id} eventTitle={event.title} requireB2b={event.require_b2b_data} fields={fields} />;
  }

  return (
    <div className="min-h-dvh bg-background" style={eventBrandStyle(event.primary_color, event.accent_color)}>
      <header className="event-hero">
        <div className="mx-auto max-w-2xl space-y-3 px-5 py-8 sm:px-6">
          <Link href={`/e/${event.slug}`} className="inline-flex items-center gap-1 text-sm opacity-85 hover:opacity-100">
            <ArrowLeft className="size-3.5" aria-hidden /> Event page
          </Link>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">Register for {event.title}</h1>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-90">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden /> {when.date}</span>
            {event.location && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden /> {event.location}</span>}
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">{body}</main>
      <PoweredBy />
    </div>
  );
}
