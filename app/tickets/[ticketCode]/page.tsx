import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { TICKET_CODE_RE, type RegistrationRow } from "@/lib/registration";
import type { EventRow } from "@/lib/events";
import { LeadConsentToggle } from "@/components/lead-consent-toggle";
import { formatEventWhen } from "@/lib/time";
import { createClient } from "@/utils/supabase/server";

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

  const qrSvg = await QRCode.toString(ticketCode, { type: "svg", margin: 1, width: 224 });
  const when = formatEventWhen(event.start_at, event.end_at, event.timezone);

  return (
    <main className="flex min-h-screen items-start justify-center bg-zinc-50 px-4 py-10">
      <div className="w-full max-w-sm space-y-5 rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold tracking-wide text-zinc-500">EventJini</p>
        <h1 className="text-xl font-semibold text-zinc-900">{event.title}</h1>

        <div className="space-y-0.5 text-sm text-zinc-700">
          <p className="font-medium text-zinc-900">
            {reg.first_name} {reg.last_name}
          </p>
          <p>{when.date}</p>
          <p>
            {when.time} ({event.timezone})
          </p>
          {event.location && <p>{event.location}</p>}
        </div>

        <div
          role="img"
          aria-label="Ticket QR code"
          className="mx-auto h-56 w-56"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <p className="font-mono text-sm tracking-wider text-zinc-900">{ticketCode}</p>
        {reg.status === "checked_in" && <p className="text-sm font-medium text-green-700">Checked in</p>}

        <LeadConsentToggle registrationId={reg.id} initial={reg.sponsor_lead_consent} />

        <div className="flex flex-col gap-2">
          <a
            href={`/api/events/${event.id}/calendar`}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Add to calendar
          </a>
          <Link href="/my-tickets" className="text-sm text-zinc-600 underline">
            My Tickets
          </Link>
        </div>
      </div>
    </main>
  );
}
