import { CalendarDays, CalendarPlus, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { PublicHeader } from "@/components/eventjini/public-header";
import { StatusBadge } from "@/components/eventjini/status-badge";
import { LeadConsentToggle } from "@/components/lead-consent-toggle";
import { buttonVariants } from "@/components/ui/button";
import type { EventRow } from "@/lib/events";
import { STATUS_LABELS, TICKET_CODE_RE, type RegistrationRow } from "@/lib/registration";
import { formatEventWhen } from "@/lib/time";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

export const metadata = { title: "Your ticket" };

export default async function TicketPage({ params }: { params: Promise<{ ticketCode: string }> }) {
  const { ticketCode } = await params;
  if (!TICKET_CODE_RE.test(ticketCode)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data } = await supabase
    .from("registrations")
    .select("*, events(*)")
    .eq("ticket_code", ticketCode)
    .eq("owner_user_id", user.id)
    .in("status", ["approved", "checked_in"])
    .maybeSingle();
  if (!data) notFound();

  const reg = data as unknown as RegistrationRow & { events: EventRow | null };
  const event = reg.events;
  if (!event) notFound();

  const qrSvg = await QRCode.toString(ticketCode, { type: "svg", margin: 2, width: 256, color: { dark: "#000000", light: "#ffffff" } });
  const when = formatEventWhen(event.start_at, event.end_at, event.timezone);

  return (
    <div className="min-h-dvh bg-muted/40">
      <PublicHeader />
      <main className="mx-auto max-w-sm px-4 py-6">
        <article className="overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm" aria-label={`Ticket for ${event.title}`}>
          <div className="space-y-3 p-6">
            <div className="flex items-start justify-between gap-3">
              <h1 className="font-heading text-xl leading-snug font-semibold tracking-tight">{event.title}</h1>
              <StatusBadge status={reg.status} label={STATUS_LABELS[reg.status]} className="shrink-0" />
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><CalendarDays className="size-4" aria-hidden /> {when.date}</li>
              <li className="flex items-center gap-2"><Clock className="size-4" aria-hidden /> {when.time} ({event.timezone})</li>
              {event.location && <li className="flex items-center gap-2"><MapPin className="size-4" aria-hidden /> {event.location}</li>}
            </ul>
          </div>

          <div className="relative border-t border-dashed px-6 py-6">
            <span aria-hidden className="absolute -top-3 -left-3 size-6 rounded-full bg-muted/40 ring-1 ring-border" />
            <span aria-hidden className="absolute -top-3 -right-3 size-6 rounded-full bg-muted/40 ring-1 ring-border" />
            <p className="text-center text-xs font-medium tracking-wide text-muted-foreground uppercase">Attendee</p>
            <p className="text-center text-lg font-semibold">{reg.first_name} {reg.last_name}</p>
            {/* Always black on white, regardless of theme, for reliable scanning. */}
            <div
              role="img"
              aria-label={`QR code for ticket ${ticketCode}`}
              className="mx-auto mt-4 w-64 max-w-full rounded-xl bg-white p-2 ring-1 ring-black/10 [&_svg]:h-auto [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="mt-3 text-center font-mono text-sm tracking-wider">{ticketCode}</p>
          </div>

          <div className="space-y-3 border-t bg-muted/30 p-6">
            <a href={`/api/events/${event.id}/calendar`} className={cn(buttonVariants({ size: "lg" }), "h-11 w-full")}>
              <CalendarPlus aria-hidden /> Add to calendar
            </a>
            <LeadConsentToggle registrationId={reg.id} initial={reg.sponsor_lead_consent} />
          </div>
        </article>
        <p className="mt-4 text-center">
          <Link href="/my-tickets" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">My Tickets</Link>
        </p>
      </main>
    </div>
  );
}
