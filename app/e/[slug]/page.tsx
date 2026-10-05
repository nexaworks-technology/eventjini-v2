import { CalendarDays, Clock, MapPin, Ticket, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageViewTracker } from "@/components/page-view-tracker";
import { PoweredBy, PublicSection } from "@/components/eventjini/public-event-chrome";
import { eventBrandStyle } from "@/lib/branding";
import { getPublishedEvent, getViewerState } from "@/lib/public-event";
import { formatEventWhen } from "@/lib/time";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

const ctaBase = "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-[filter] focus-visible:ring-3 focus-visible:ring-ring/50";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const event = await getPublishedEvent((await params).slug);
  return { title: event ? event.title : "Event not found" };
}

export default async function PublicEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const event = await getPublishedEvent((await params).slug);
  if (!event) notFound();

  const when = formatEventWhen(event.start_at, event.end_at, event.timezone);
  const { soldOut, registration } = await getViewerState(event);

  const supabase = await createClient();
  const [{ data: sessionRows }, { count: tierCount }] = await Promise.all([
    supabase.from("event_sessions").select("id,title,speaker,description,start_at,end_at").eq("event_id", event.id).order("start_at"),
    supabase.from("sponsorship_tiers").select("id", { count: "exact", head: true }).eq("event_id", event.id),
  ]);
  const sessions = sessionRows ?? [];
  const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: event.timezone, hour: "numeric", minute: "2-digit" });

  const registerHref = `/e/${event.slug}/register`;

  /** Same states and destinations as before; `onHero` only changes colours. */
  function cta(onHero: boolean) {
    const btn = cn(ctaBase, onHero ? "event-cta-inverse" : "event-cta");
    if (registration?.status === "approved" || registration?.status === "checked_in") {
      return (
        <div className="space-y-2">
          <p className="font-medium">You&apos;re registered</p>
          <Link href={`/tickets/${registration.ticket_code}`} className={btn}><Ticket className="size-4" aria-hidden /> View ticket</Link>
        </div>
      );
    }
    if (registration?.status === "pending") {
      return (
        <div className="space-y-2">
          <p className="font-medium">Application pending</p>
          <Link href="/my-tickets" className={btn}>View My Tickets</Link>
        </div>
      );
    }
    if (registration?.status === "rejected") return <p className="font-medium">Registration not approved</p>;
    if (registration?.status === "cancelled") return <p className="font-medium">Your registration was cancelled</p>;
    if (soldOut) return <p className="text-lg font-semibold tracking-wide uppercase">Sold out</p>;
    return <Link href={registerHref} className={btn}>Register</Link>;
  }

  return (
    <div className="min-h-dvh bg-background" style={eventBrandStyle(event.primary_color, event.accent_color)}>
      <PageViewTracker eventId={event.id} />

      {event.cover_image_url ? (
        <header className="mx-auto max-w-4xl px-4 pt-4 sm:px-6 sm:pt-6">
          {/* Shown uncropped: banners often contain text. Decorative; the event is identified by the heading. */}
          <div className="overflow-hidden rounded-2xl border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.cover_image_url} alt="" fetchPriority="high" decoding="async" className="mx-auto block h-auto max-h-[26rem] w-full object-contain" />
          </div>
          <div className="mt-6 space-y-4 pb-2">
            <div className="h-1 w-16 rounded-full" style={{ backgroundColor: "var(--event-primary)" }} aria-hidden />
            <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">{event.title}</h1>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground sm:text-base">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden /> {when.date}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="size-4" aria-hidden /> {when.time} ({event.timezone})</span>
              {event.location && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden /> {event.location}</span>}
            </div>
            <div>{cta(false)}</div>
          </div>
        </header>
      ) : (
        <header className="event-hero">
          <div className="mx-auto max-w-3xl space-y-5 px-5 py-10 sm:px-8 sm:py-14">
            <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">{event.title}</h1>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm opacity-90 sm:text-base">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden /> {when.date}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="size-4" aria-hidden /> {when.time} ({event.timezone})</span>
              {event.location && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden /> {event.location}</span>}
            </div>
            <div>{cta(true)}</div>
          </div>
        </header>
      )}

      <main className={cn("mx-auto space-y-5 px-4 py-8 sm:px-6", event.cover_image_url ? "max-w-4xl" : "max-w-3xl")}>
        {event.description && (
          <PublicSection title="About">
            <p className="leading-7 whitespace-pre-line text-foreground/90">{event.description}</p>
            {event.capacity !== null && (
              <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Users className="size-4" aria-hidden /> {event.capacity} {event.capacity === 1 ? "attendee" : "attendees"}</p>
            )}
          </PublicSection>
        )}
        {!event.description && event.capacity !== null && (
          <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Users className="size-4" aria-hidden /> {event.capacity} {event.capacity === 1 ? "attendee" : "attendees"}</p>
        )}

        {sessions.length > 0 && (
          <PublicSection title="Agenda">
            <ol className="space-y-4">
              {sessions.map((s) => (
                <li key={s.id} className="grid grid-cols-[4.5rem_1fr] gap-3 border-l-2 pl-3" style={{ borderColor: "var(--event-primary)" }}>
                  <p className="text-sm font-medium text-muted-foreground tabular-nums">{timeFmt.format(new Date(s.start_at))}</p>
                  <div>
                    <p className="font-medium">{s.title}</p>
                    {s.speaker && <p className="text-sm text-foreground/80">{s.speaker}</p>}
                    {s.description && <p className="text-sm whitespace-pre-line text-muted-foreground">{s.description}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </PublicSection>
        )}

        {(tierCount ?? 0) > 0 && (
          <PublicSection title="Sponsors">
            <p className="text-sm text-muted-foreground">Interested in reaching this audience?</p>
            <Link href={`/e/${event.slug}/sponsors`} className="text-sm font-medium underline underline-offset-4">View sponsorship opportunities</Link>
          </PublicSection>
        )}

        {sessions.length > 0 && (
          <section className="event-rule rounded-xl border bg-card p-5 text-card-foreground sm:p-6">{cta(false)}</section>
        )}
      </main>
      <PoweredBy />
    </div>
  );
}
