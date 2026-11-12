import { AgendaBoard, type AgendaDay } from "@/components/agenda-board";
import { PageHeader } from "@/components/eventjini/page-header";
import { dayWindow, toSlot, type AgendaSession, type Hall, type SessionType, type Track } from "@/lib/agenda";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";
import { eventDays, formatEventWhen, utcToZoned } from "@/lib/time";

type SessionRow = {
  id: string;
  title: string;
  description: string | null;
  speaker: string | null;
  start_at: string | null;
  end_at: string | null;
  session_type: SessionType;
  is_featured: boolean;
  track_id: string | null;
  hall_id: string | null;
};

export default async function AgendaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, event, role } = await requireEventAccess(id);

  const [{ data: sessionRows }, { data: trackRows }, { data: hallRows }, { data: speakerRows }, { data: links }] = await Promise.all([
    supabase
      .from("event_sessions")
      .select("id,title,description,speaker,start_at,end_at,session_type,is_featured,track_id,hall_id")
      .eq("event_id", id)
      .order("start_at", { nullsFirst: false })
      .order("title"),
    supabase.from("event_tracks").select("id,name,sort_order").eq("event_id", id).order("sort_order").order("created_at"),
    supabase.from("event_halls").select("id,name,sort_order").eq("event_id", id).order("sort_order").order("created_at"),
    supabase.from("event_speakers").select("id,name,designation,organization").eq("event_id", id).order("name"),
    supabase.from("event_session_speakers").select("session_id,speaker_id").eq("event_id", id).order("sort_order"),
  ]);

  const linksBySession = new Map<string, string[]>();
  for (const l of links ?? []) linksBySession.set(l.session_id, [...(linksBySession.get(l.session_id) ?? []), l.speaker_id]);

  const sessions: AgendaSession[] = ((sessionRows ?? []) as SessionRow[]).map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    sessionType: s.session_type,
    isFeatured: s.is_featured,
    trackId: s.track_id,
    hallId: s.hall_id,
    speakerIds: linksBySession.get(s.id) ?? [],
    speakerText: s.speaker,
    slot: toSlot(s.start_at, s.end_at, event.timezone),
  }));

  const bounds = { start: utcToZoned(event.start_at, event.timezone), end: utcToZoned(event.end_at, event.timezone) };
  const days: AgendaDay[] = eventDays(event.start_at, event.end_at, event.timezone).map((d, i) => ({
    date: d.date,
    label: d.label,
    short: `Day ${i + 1}`,
    window: dayWindow(d.date, bounds),
  }));
  const eventWhen = formatEventWhen(event.start_at, event.end_at, event.timezone);

  return (
    <div className="space-y-6">
      <PageHeader level={2} title="Agenda" description={<>The event runs {eventWhen.date}, {eventWhen.time}. Times shown in {event.timezone}.</>} />
      <AgendaBoard
        eventId={id}
        canEdit={ADMIN_ROLES.includes(role)}
        days={days}
        sessions={sessions}
        tracks={(trackRows ?? []) as Track[]}
        halls={(hallRows ?? []) as Hall[]}
        speakers={(speakerRows ?? []).map((s) => ({ id: s.id, name: s.name, detail: [s.designation, s.organization].filter(Boolean).join(", ") }))}
      />
    </div>
  );
}
