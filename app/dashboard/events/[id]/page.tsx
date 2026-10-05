import { BarChart3, CalendarClock, ExternalLink, ListChecks, Mail, MapPin, Pencil, ScanLine, Users } from "lucide-react";
import Link from "next/link";
import { FormMessage } from "@/components/eventjini/form-feedback";
import { MetricCard } from "@/components/eventjini/metric-card";
import { SectionTitle } from "@/components/eventjini/page-header";
import { PublishButton } from "@/components/publish-button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ADMIN_ROLES, CHECKIN_ROLES, requireEventAccess, TASK_READ_ROLES, type EventRole } from "@/lib/event-access";
import { formatEventWhen } from "@/lib/time";
import { cn } from "@/lib/utils";

const QUICK_LINKS: { path: string; label: string; description: string; roles: EventRole[] | null; icon: typeof Users }[] = [
  { path: "/guests", label: "Guests", description: "Search, filter and export attendees", roles: ADMIN_ROLES, icon: Users },
  { path: "/check-in", label: "Check-in", description: "Scan QR tickets or enter codes", roles: CHECKIN_ROLES, icon: ScanLine },
  { path: "/agenda", label: "Agenda", description: "Sessions, speakers and timing", roles: null, icon: CalendarClock },
  { path: "/tasks", label: "Tasks", description: "Your event operations board", roles: TASK_READ_ROLES, icon: ListChecks },
  { path: "/communications", label: "Communications", description: "Email your attendees", roles: ADMIN_ROLES, icon: Mail },
  { path: "/analytics", label: "Analytics", description: "Traffic, registrations and attendance", roles: TASK_READ_ROLES, icon: BarChart3 },
];

export default async function EventOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ published?: string; denied?: string }>;
}) {
  const { id } = await params;
  const { published, denied } = await searchParams;
  const { supabase, event, role } = await requireEventAccess(id);

  const when = formatEventWhen(event.start_at, event.end_at, event.timezone);
  const isPublished = event.status === "published";
  const isAdmin = ADMIN_ROLES.includes(role);

  const [{ data: sessions }, { data: regRows }] = await Promise.all([
    supabase.from("event_sessions").select("id,title,speaker,start_at,end_at").eq("event_id", id).order("start_at").limit(6),
    isAdmin ? supabase.from("registrations").select("status").eq("event_id", id) : Promise.resolve({ data: null }),
  ]);

  const counts: Record<string, number> = {};
  for (const r of regRows ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
  const confirmed = (counts.approved ?? 0) + (counts.checked_in ?? 0);
  const links = QUICK_LINKS.filter((l) => !l.roles || l.roles.includes(role));

  return (
    <div className="max-w-4xl space-y-6">
      {denied === "1" && <FormMessage tone="warning">You don&apos;t have access to that page for this event.</FormMessage>}
      {published === "1" && isPublished && <FormMessage tone="success">Your event is published.</FormMessage>}

      {role === "scanner" && (
        <Link href={`/dashboard/events/${id}/check-in`} className={cn(buttonVariants({ size: "lg" }), "h-14 w-full text-base")}>
          <ScanLine aria-hidden /> Start check-in
        </Link>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 text-sm">
            <p className="font-medium text-foreground">{when.date}</p>
            <p className="text-muted-foreground">{when.time} · {event.timezone}</p>
            {event.location && (
              <p className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="size-3.5" aria-hidden /> {event.location}</p>
            )}
            {isPublished && isAdmin && <p className="pt-1 text-xs text-muted-foreground">Public URL: <span className="font-mono text-foreground">/e/{event.slug}</span></p>}
          </div>
          {isAdmin && (
            <div className="flex flex-wrap items-start gap-2">
              {isPublished && (
                <Link href={`/e/${event.slug}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
                  View public page <ExternalLink aria-hidden />
                </Link>
              )}
              <Link href={`/dashboard/events/${event.id}/edit`} className={buttonVariants({ variant: "outline", size: "lg" })}>
                <Pencil aria-hidden /> Edit
              </Link>
              {event.status === "draft" && <PublishButton eventId={event.id} />}
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard label="Registrations" value={(regRows ?? []).length} hint={counts.pending ? `${counts.pending} pending approval` : undefined} />
          <MetricCard label="Checked in" value={counts.checked_in ?? 0} />
          <MetricCard label="Capacity" value={event.capacity === null ? "No limit" : `${confirmed} / ${event.capacity}`} hint={event.capacity === null ? `${confirmed} confirmed` : "confirmed seats"} />
        </div>
      )}

      <section className="space-y-3">
        <SectionTitle>Event operations</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map(({ path, label, description, icon: Icon }) => (
            <Link key={path} href={`/dashboard/events/${id}${path}`} className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40">
              <Icon className="size-5 text-primary" aria-hidden />
              <p className="mt-2 font-medium">{label}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </Link>
          ))}
        </div>
      </section>

      {(sessions?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <SectionTitle>Agenda</SectionTitle>
          <Card size="sm">
            <CardContent>
              <ul className="divide-y">
                {sessions!.map((s) => (
                  <li key={s.id} className="flex flex-wrap gap-x-3 py-2 text-sm first:pt-0 last:pb-0">
                    <span className="w-36 shrink-0 text-muted-foreground tabular-nums">{formatEventWhen(s.start_at, s.end_at, event.timezone).time}</span>
                    <span className="font-medium">{s.title}</span>
                    {s.speaker && <span className="text-muted-foreground">{s.speaker}</span>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
