import { CalendarDays, Plus, ScanLine } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/eventjini/empty-state";
import { FormMessage } from "@/components/eventjini/form-feedback";
import { PageHeader } from "@/components/eventjini/page-header";
import { buttonVariants } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { ROLE_LABELS, type EventRole } from "@/lib/event-access";
import type { EventRow } from "@/lib/events";
import { btnPrimary } from "@/components/eventjini/classes";
import { StatusBadge } from "@/components/eventjini/status-badge";
import { formatShortDate } from "@/lib/time";
import { createClient } from "@/utils/supabase/server";

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ access?: string }> }) {
  const { access } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/login");

  const [{ data: ownedData, error: ownedError }, { data: memberRows }] = await Promise.all([
    supabase.from("events").select("*").eq("organizer_id", user.id),
    supabase.from("event_members").select("event_id,role").eq("user_id", user.id),
  ]);

  const roleByEvent = new Map<string, EventRole>();
  for (const m of memberRows ?? []) roleByEvent.set(m.event_id, m.role as EventRole);

  let memberEvents: EventRow[] = [];
  if (roleByEvent.size > 0) {
    const { data } = await supabase.from("events").select("*").in("id", [...roleByEvent.keys()]);
    memberEvents = (data ?? []) as EventRow[];
  }

  const items = [
    ...((ownedData ?? []) as EventRow[]).map((e) => ({ event: e, role: "owner" as EventRole })),
    ...memberEvents.map((e) => ({ event: e, role: roleByEvent.get(e.id)! })),
  ].sort((a, b) => a.event.start_at.localeCompare(b.event.start_at));
  const error = ownedError;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Events"
        description="Events you own and events you've been added to."
        actions={<Link href="/dashboard/events/new" className={btnPrimary}><Plus aria-hidden /> Create event</Link>}
      />

      {access === "removed" && <FormMessage tone="warning">You no longer have access to this event.</FormMessage>}
      {error && <FormMessage>Could not load your events. Please refresh and try again.</FormMessage>}

      {!error && items.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title="No events yet"
          description="Create your first event to start taking registrations."
          action={<Link href="/dashboard/events/new" className={btnPrimary}><Plus aria-hidden /> Create event</Link>}
        />
      )}

      {items.length > 0 && (
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {items.map(({ event, role }) => {
          const admin = role === "owner" || role === "admin";
          return (
            <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/40">
              <div className="min-w-0 space-y-1">
                <Link href={`/dashboard/events/${event.id}`} className="font-medium hover:underline">
                  {event.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {formatShortDate(event.start_at, event.timezone)}
                  {event.location ? ` · ${event.location}` : ""}
                </p>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <StatusBadge status={event.status} /> {ROLE_LABELS[role]}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1">
                {role === "scanner" && (
                  <Link href={`/dashboard/events/${event.id}/check-in`} className={buttonVariants({ size: "lg" })}><ScanLine aria-hidden /> Open scanner</Link>
                )}
                {admin && event.status === "published" && (
                  <Link href={`/e/${event.slug}`} className={buttonVariants({ variant: "ghost", size: "lg" })}>View public page</Link>
                )}
                {admin && (
                  <Link href={`/dashboard/events/${event.id}/edit`} className={buttonVariants({ variant: "outline", size: "lg" })}>Edit</Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      )}
    </div>
  );
}
