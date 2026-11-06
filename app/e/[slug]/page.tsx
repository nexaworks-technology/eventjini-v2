import { CalendarDays, Clock, ExternalLink, MapPin, MonitorPlay, Ticket, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageViewTracker } from "@/components/page-view-tracker";
import { PoweredBy, PublicSection } from "@/components/eventjini/public-event-chrome";
import { eventBrandStyle } from "@/lib/branding";
import { EVENT_TYPES, mapsUrl, SOCIAL_KEYS, SOCIAL_LABELS } from "@/lib/events";
import { FEATURES } from "@/lib/features";
import { initials, SPEAKER_SOCIAL_KEYS, SPEAKER_SOCIAL_LABELS, speakerTitleLine, type SpeakerRow } from "@/lib/speakers";
import { getPublishedEvent, getViewerState } from "@/lib/public-event";
import { eventDays, formatEventWhen, utcToZoned } from "@/lib/time";
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
  const [{ data: sessionRows }, { count: tierCount }, { data: speakerRows }, { data: linkRows }] = await Promise.all([
    supabase.from("event_sessions").select("id,title,speaker,description,start_at,end_at").eq("event_id", event.id).order("start_at"),
    FEATURES.sponsors
      ? supabase.from("sponsorship_tiers").select("id", { count: "exact", head: true }).eq("event_id", event.id)
      : Promise.resolve({ count: 0 }),
    supabase.from("event_speakers").select("*").eq("event_id", event.id).order("is_featured", { ascending: false }).order("sort_order").order("name"),
    supabase.from("event_session_speakers").select("session_id,speaker_id").eq("event_id", event.id).order("sort_order"),
  ]);
  const speakers = (speakerRows ?? []) as SpeakerRow[];
  const speakerById = new Map(speakers.map((sp) => [sp.id, sp]));
  const sessionSpeakers = new Map<string, SpeakerRow[]>();
  for (const l of linkRows ?? []) {
    const sp = speakerById.get(l.speaker_id);
    if (sp) sessionSpeakers.set(l.session_id, [...(sessionSpeakers.get(l.session_id) ?? []), sp]);
  }
  const sessions = sessionRows ?? [];
  const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: event.timezone, hour: "numeric", minute: "2-digit" });
  const days = eventDays(event.start_at, event.end_at, event.timezone);
  const agendaDays: { key: string; label: string | null; sessions: typeof sessions }[] = [];
  for (const s of sessions) {
    const date = utcToZoned(s.start_at, event.timezone).date;
    const idx = days.findIndex((d) => d.date === date);
    const label = days.length > 1 ? (idx >= 0 ? `Day ${idx + 1} · ${days[idx].label}` : date) : null;
    const group = agendaDays.at(-1);
    if (group?.key === date) group.sessions.push(s);
    else agendaDays.push({ key: date, label, sessions: [s] });
  }

  const registerHref = `/e/${event.slug}/register`;
  const mapHref = event.event_type !== "virtual" ? mapsUrl(event) : null;
  const typeLabel = event.event_type !== "in_person" ? EVENT_TYPES.find((t) => t.value === event.event_type)?.label : null;
  const socials = SOCIAL_KEYS.flatMap((k) => (event.social_links?.[k] ? [{ key: k, href: event.social_links[k]! }] : []));
  const tags = event.tags ?? [];
  const venue = event.location && (
    <span className="inline-flex items-center gap-1.5">
      <MapPin className="size-4" aria-hidden />
      {mapHref ? <a href={mapHref} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{event.location}</a> : event.location}
    </span>
  );
  const typeBadge = typeLabel && <span className="inline-flex items-center gap-1.5"><MonitorPlay className="size-4" aria-hidden /> {typeLabel} event</span>;

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
      {FEATURES.analytics && <PageViewTracker eventId={event.id} />}

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
            {event.summary && <p className="text-lg text-pretty text-foreground/80">{event.summary}</p>}
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground sm:text-base">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden /> {when.date}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="size-4" aria-hidden /> {when.time} ({event.timezone})</span>
              {venue}
              {typeBadge}
            </div>
            <div>{cta(false)}</div>
          </div>
        </header>
      ) : (
        <header className="event-hero">
          <div className="mx-auto max-w-3xl space-y-5 px-5 py-10 sm:px-8 sm:py-14">
            <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">{event.title}</h1>
            {event.summary && <p className="text-lg text-pretty opacity-90">{event.summary}</p>}
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm opacity-90 sm:text-base">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden /> {when.date}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="size-4" aria-hidden /> {when.time} ({event.timezone})</span>
              {venue}
              {typeBadge}
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

        {event.venue_address && event.event_type !== "virtual" && (
          <PublicSection title="Venue">
            {event.location && <p className="font-medium">{event.location}</p>}
            <p className="text-sm whitespace-pre-line text-muted-foreground">{event.venue_address}</p>
            {mapHref && (
              <a href={mapHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4">
                Open in Google Maps <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </PublicSection>
        )}

        {(tags.length > 0 || socials.length > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((t) => (
              <span key={t} className="rounded-full border bg-card px-2.5 py-0.5 text-xs text-muted-foreground">{t}</span>
            ))}
            {socials.map((s) => (
              <a key={s.key} href={s.href} target="_blank" rel="noopener noreferrer nofollow" className="rounded-full border bg-card px-2.5 py-0.5 text-xs font-medium hover:bg-muted">
                {SOCIAL_LABELS[s.key]}
              </a>
            ))}
          </div>
        )}

        {sessions.length > 0 && (
          <PublicSection title="Agenda">
            <div className="space-y-6">
              {agendaDays.map((day) => (
                <div key={day.key} className="space-y-3">
                  {day.label && <h3 className="font-heading text-sm font-semibold">{day.label}</h3>}
                  <ol className="space-y-4">
                    {day.sessions.map((s) => (
                      <li key={s.id} className="grid grid-cols-[4.5rem_1fr] gap-3 border-l-2 pl-3" style={{ borderColor: "var(--event-primary)" }}>
                        <p className="text-sm font-medium text-muted-foreground tabular-nums">{timeFmt.format(new Date(s.start_at))}</p>
                        <div>
                          <p className="font-medium">{s.title}</p>
                          {(sessionSpeakers.has(s.id) || s.speaker) && (
                            <p className="text-sm text-foreground/80">
                              {[...(sessionSpeakers.get(s.id) ?? []).map((sp) => sp.name), ...(s.speaker ? [s.speaker] : [])].join(", ")}
                            </p>
                          )}
                          {s.description && <p className="text-sm whitespace-pre-line text-muted-foreground">{s.description}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </PublicSection>
        )}

        {speakers.length > 0 && (
          <PublicSection title="Speakers">
            <ul className="grid gap-4 sm:grid-cols-2">
              {speakers.map((sp) => (
                <li key={sp.id} className="flex gap-3">
                  {sp.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sp.photo_url} alt="" loading="lazy" className="size-14 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span aria-hidden className="inline-flex size-14 shrink-0 items-center justify-center rounded-full font-semibold" style={{ backgroundColor: "color-mix(in oklch, var(--event-primary) 15%, transparent)", color: "var(--event-primary)" }}>
                      {initials(sp.name)}
                    </span>
                  )}
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-medium">{sp.name}</p>
                    {speakerTitleLine(sp) && <p className="text-sm text-muted-foreground">{speakerTitleLine(sp)}</p>}
                    {sp.bio && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">About</summary>
                        <p className="mt-1 whitespace-pre-line text-foreground/90">{sp.bio}</p>
                      </details>
                    )}
                    {SPEAKER_SOCIAL_KEYS.some((k) => sp.social_links?.[k]) && (
                      <p className="flex flex-wrap gap-2 pt-0.5 text-xs">
                        {SPEAKER_SOCIAL_KEYS.filter((k) => sp.social_links?.[k]).map((k) => (
                          <a key={k} href={sp.social_links[k]} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-4">
                            {SPEAKER_SOCIAL_LABELS[k]}
                          </a>
                        ))}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
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
