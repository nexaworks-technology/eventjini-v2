import Link from "next/link";
import {
  STATUS_LABELS,
  type RegistrationRow,
} from "@/lib/registration";
import { LeadConsentToggle } from "@/components/lead-consent-toggle";
import { formatShortDate } from "@/lib/time";
import { createClient } from "@/utils/supabase/server";

type Item = RegistrationRow & {
  events: {
    id: string;
    title: string;
    slug: string;
    start_at: string;
    timezone: string;
    location: string | null;
  } | null;
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
    <main className="mx-auto min-h-screen max-w-2xl space-y-6 px-4 py-10">
      <div>
        <p className="text-sm font-semibold tracking-wide text-zinc-500">EventJini</p>
        <h1 className="text-2xl font-semibold text-zinc-900">My Tickets</h1>
      </div>

      {failed && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not load your tickets. Please refresh and try again.
        </p>
      )}

      {!failed && items.length === 0 && (
        <div className="rounded-xl bg-white p-8 text-center text-zinc-600 shadow-sm">
          You don&apos;t have any tickets in this browser yet.
        </div>
      )}

      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r.id} className="space-y-2 rounded-xl bg-white p-5 shadow-sm">
            <div>
              <p className="font-medium text-zinc-900">{r.events?.title ?? "Event"}</p>
              {r.events && (
                <p className="text-sm text-zinc-600">
                  {formatShortDate(r.events.start_at, r.events.timezone)}
                  {r.events.location ? ` • ${r.events.location}` : ""}
                </p>
              )}
            </div>
            <p className="text-sm font-medium text-zinc-700">{STATUS_LABELS[r.status]}</p>
            {(r.status === "approved" || r.status === "checked_in") && r.ticket_code && (
              <div className="flex gap-3 text-sm">
                <Link
                  href={`/tickets/${r.ticket_code}`}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white hover:bg-zinc-700"
                >
                  View ticket
                </Link>
                {r.events && (
                  <a
                    href={`/api/events/${r.events.id}/calendar`}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium text-zinc-900 hover:bg-zinc-50"
                  >
                    Add to calendar
                  </a>
                )}
              </div>
            )}
            {(r.status === "approved" || r.status === "checked_in") && (
              <LeadConsentToggle registrationId={r.id} initial={r.sponsor_lead_consent} />
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
