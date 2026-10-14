import { PageHeader } from "@/components/eventjini/page-header";
import { AgendaEditor, type AgendaItem } from "@/components/agenda-editor";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";
import { eventDays, formatEventWhen, utcToZoned } from "@/lib/time";

type SessionRow = {
  id: string;
  title: string;
  description: string | null;
  speaker: string | null;
  start_at: string;
  end_at: string;
};

export default async function AgendaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, event, role } = await requireEventAccess(id);

  const { data } = await supabase
    .from("event_sessions")
    .select("id,title,description,speaker,start_at,end_at")
    .eq("event_id", id)
    .order("start_at")
    .order("sort_order");
  const sessions = (data ?? []) as SessionRow[];

  const days = eventDays(event.start_at, event.end_at, event.timezone).map((d, i, all) => ({
    date: d.date,
    label: all.length > 1 ? `Day ${i + 1} · ${d.label}` : d.label,
  }));
  const dayLabel = (date: string) => days.find((d) => d.date === date)?.label ?? new Intl.DateTimeFormat("en-US", { timeZone: "UTC", dateStyle: "full" }).format(new Date(`${date}T00:00:00Z`));
  const eventWhen = formatEventWhen(event.start_at, event.end_at, event.timezone);

  const items: AgendaItem[] = sessions.map((s) => {
    const w = formatEventWhen(s.start_at, s.end_at, event.timezone);
    const a = utcToZoned(s.start_at, event.timezone);
    const b = utcToZoned(s.end_at, event.timezone);
    return {
      id: s.id,
      title: s.title,
      description: s.description,
      speaker: s.speaker,
      dateLabel: dayLabel(a.date),
      timeLabel: w.time,
      form: {
        title: s.title,
        description: s.description ?? "",
        speaker: s.speaker ?? "",
        startDate: a.date,
        startTime: a.time,
        endDate: b.date,
        endTime: b.time,
      },
    };
  });

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader level={2} title={"Agenda"} description={<>The event runs {eventWhen.date}, {eventWhen.time}. Times shown in {event.timezone}.</>} />
      <AgendaEditor
        eventId={id}
        items={items}
        canEdit={ADMIN_ROLES.includes(role)}
        days={days}
      />
    </div>
  );
}
