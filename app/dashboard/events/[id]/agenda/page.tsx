import { PageHeader } from "@/components/eventjini/page-header";
import { AgendaEditor, type AgendaItem } from "@/components/agenda-editor";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";
import { formatEventWhen, utcToZoned } from "@/lib/time";

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

  const items: AgendaItem[] = sessions.map((s) => {
    const w = formatEventWhen(s.start_at, s.end_at, event.timezone);
    const a = utcToZoned(s.start_at, event.timezone);
    const b = utcToZoned(s.end_at, event.timezone);
    return {
      id: s.id,
      title: s.title,
      description: s.description,
      speaker: s.speaker,
      dateLabel: new Intl.DateTimeFormat("en-US", { timeZone: event.timezone, dateStyle: "full" }).format(new Date(s.start_at)),
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
      <PageHeader level={2} title={"Agenda"} description={<>Times shown in {event.timezone}.</>} />
      <AgendaEditor
        eventId={id}
        items={items}
        canEdit={ADMIN_ROLES.includes(role)}
        defaultDate={utcToZoned(event.start_at, event.timezone).date}
      />
    </div>
  );
}
