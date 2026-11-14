import { CalendarDays, Plus, ScanLine } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/eventjini/empty-state";
import { FormMessage } from "@/components/eventjini/form-feedback";
import { PageHeader, SectionTitle } from "@/components/eventjini/page-header";
import { buttonVariants } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { ROLE_LABELS, type EventRole } from "@/lib/event-access";
import type { EventRow } from "@/lib/events";
import { getOrganizations } from "@/lib/organizations";
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

  const { orgs, current } = await getOrganizations(supabase, user.id);
  const orgIds = new Set(orgs.map((o) => o.id));

  const [{ data: orgData, error }, { data: memberRows }] = await Promise.all([
    current
      ? supabase.from("events").select("*").eq("organization_id", current.id)
      : Promise.resolve({ data: [] as EventRow[], error: null }),
    supabase.from("event_members").select("event_id,role").eq("user_id", user.id),
  ]);

  // Events someone added you to directly, outside your organizations.
  const roleByEvent = new Map<string, EventRole>();
  for (const m of memberRows ?? []) roleByEvent.set(m.event_id, m.role as EventRole);
  let shared: EventRow[] = [];
  if (roleByEvent.size > 0) {
    const { data } = await supabase.from("events").select("*").in("id", [...roleByEvent.keys()]);
    shared = ((data ?? []) as EventRow[]).filter((e) => !orgIds.has(e.organization_id));
  }

  if (!current && shared.length === 0) redirect("/dashboard/org/new");

  const byDate = (a: { event: EventRow }, b: { event: EventRow }) => a.event.start_at.localeCompare(b.event.start_at);
  const orgRole: EventRole = current?.role === "owner" ? "owner" : "admin";
  const items = ((orgData ?? []) as EventRow[])
    .map((e) => ({ event: e, role: e.organizer_id === user.id ? ("owner" as EventRole) : orgRole }))
    .sort(byDate);
  const sharedItems = shared.map((e) => ({ event: e, role: roleByEvent.get(e.id)! })).sort(byDate);
  const canCreate = current?.role === "owner" || current?.role === "admin";
  const createButton = canCreate ? <Link href="/dashboard/events/new" className={btnPrimary}><Plus aria-hidden /> Create event</Link> : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Events"
        description={current ? <>Events in <span className="font-medium text-foreground">{current.name}</span>.</> : "Events you've been added to."}
        actions={createButton}
      />

      {access === "removed" && <FormMessage tone="warning">You no longer have access to this event.</FormMessage>}
      {error && <FormMessage>Could not load your events. Please refresh and try again.</FormMessage>}

      {!error && current && items.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title="No events yet"
          description={canCreate ? "Create your first event to start taking registrations." : "An owner or admin of this organization can create events."}
          action={createButton}
        />
      )}

      {items.length > 0 && <EventList items={items} />}

      {sharedItems.length > 0 && (
        <section className="space-y-3">
          <SectionTitle description="Events outside your organizations that someone added you to.">Shared with you</SectionTitle>
          <EventList items={sharedItems} />
        </section>
      )}
    </div>
  );
}

function EventList({ items }: { items: { event: EventRow; role: EventRole }[] }) {
  return (
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
  );
}
