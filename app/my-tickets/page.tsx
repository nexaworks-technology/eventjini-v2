import { CalendarDays, CalendarPlus, MapPin, Ticket } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/eventjini/empty-state";
import { FormMessage } from "@/components/eventjini/form-feedback";
import { PageHeader } from "@/components/eventjini/page-header";
import { PublicHeader } from "@/components/eventjini/public-header";
import { StatusBadge } from "@/components/eventjini/status-badge";
import { LeadConsentToggle } from "@/components/lead-consent-toggle";
import { buttonVariants } from "@/components/ui/button";
import { STATUS_LABELS, type RegistrationRow } from "@/lib/registration";
import { formatShortDate } from "@/lib/time";
import { createClient } from "@/utils/supabase/server";

export const metadata = { title: "My Tickets" };

type Item = RegistrationRow & {
  events: { id: string; title: string; slug: string; start_at: string; timezone: string; location: string | null } | null;
};

export default async function MyTicketsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let items: Item[] = [];
  let failed = false;
  if (user) {
    const { data, error } = await supabase
      .from("registrations")
      .select("*, events(id, title, slug, start_at, timezone, location)")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) failed = true;
    items = (data ?? []) as unknown as Item[];
  }

  return (
    <div className="min-h-dvh bg-muted/40">
      <PublicHeader />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <PageHeader title="My Tickets" description="Tickets and applications registered in this browser." />

        {failed && <FormMessage>Could not load your tickets. Please refresh and try again.</FormMessage>}
        {!failed && items.length === 0 && (
          <EmptyState icon={Ticket} title="No tickets yet" description="Tickets you register for in this browser will appear here." />
        )}

        <ul className="space-y-3">
          {items.map((r) => {
            const active = r.status === "approved" || r.status === "checked_in";
            return (
              <li key={r.id} className="space-y-4 rounded-xl border bg-card p-5 text-card-foreground">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="font-heading font-semibold">{r.events?.title ?? "Event"}</p>
                    {r.events && (
                      <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" aria-hidden /> {formatShortDate(r.events.start_at, r.events.timezone)}</span>
                        {r.events.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden /> {r.events.location}</span>}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={r.status} label={STATUS_LABELS[r.status]} />
                </div>
                {active && r.ticket_code && (
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/tickets/${r.ticket_code}`} className={buttonVariants({ size: "lg" })}><Ticket aria-hidden /> View ticket</Link>
                    {r.events && (
                      <a href={`/api/events/${r.events.id}/calendar`} className={buttonVariants({ variant: "outline", size: "lg" })}><CalendarPlus aria-hidden /> Add to calendar</a>
                    )}
                  </div>
                )}
                {active && <LeadConsentToggle registrationId={r.id} initial={r.sponsor_lead_consent} />}
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
