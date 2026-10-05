import Link from "next/link";
import { EventNav } from "@/components/event-nav";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";
import { GUEST_FILTERS, parseFilter, queryGuests, sanitizeSearch } from "@/lib/guests";
import { STATUS_LABELS, type RegistrationField } from "@/lib/registration";

export default async function GuestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, event, role } = await requireEventAccess(id, ADMIN_ROLES);

  const q = sanitizeSearch(sp.q);
  const filter = parseFilter(sp.status);

  const [{ rows, error }, { data: statusRows }, { data: fieldRows }] = await Promise.all([
    queryGuests(supabase, id, q, filter, 500),
    supabase.from("registrations").select("status").eq("event_id", id),
    supabase.from("event_registration_fields").select("field_key,label").eq("event_id", id),
  ]);

  const counts: Record<string, number> = { all: statusRows?.length ?? 0 };
  for (const r of statusRows ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
  const labels = new Map((fieldRows as Pick<RegistrationField, "field_key" | "label">[] | null)?.map((f) => [f.field_key, f.label]));

  const qs = (status: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status !== "all") p.set("status", status);
    const s = p.toString();
    return `/dashboard/events/${id}/guests${s ? `?${s}` : ""}`;
  };
  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (filter !== "all") exportParams.set("status", filter);
  const exportHref = `/api/events/${id}/guests.csv${exportParams.size ? `?${exportParams}` : ""}`;

  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-6 px-4 py-10">
      <EventNav eventId={id} eventTitle={event.title} role={role} active="guests" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-zinc-900">
          Guests <span className="text-zinc-500">{counts.all}</span>
        </h2>
        <a
          href={exportHref}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Export CSV
        </a>
      </div>

      <form method="get" className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, email, company or ticket code"
          className="min-w-64 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
        />
        {filter !== "all" && <input type="hidden" name="status" value={filter} />}
        <button type="submit" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
          Search
        </button>
        {q && (
          <Link href={qs("all").replace(/\?.*/, "") + (filter !== "all" ? `?status=${filter}` : "")} className="self-center text-sm text-zinc-600 underline">
            Clear
          </Link>
        )}
      </form>

      <nav className="flex flex-wrap gap-2 text-sm">
        {GUEST_FILTERS.map((f) => (
          <Link
            key={f.key}
            href={qs(f.key)}
            className={`rounded-full px-3 py-1 ${filter === f.key ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}
          >
            {f.label} {counts[f.key] ?? 0}
          </Link>
        ))}
      </nav>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not load guests. Please refresh and try again.
        </p>
      )}
      {!error && rows.length === 0 && (
        <div className="rounded-xl bg-white p-8 text-center text-zinc-600 shadow-sm">No guests match.</div>
      )}

      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-zinc-900">
                  {r.first_name} {r.last_name}
                </p>
                <p className="text-sm text-zinc-600">{r.email}</p>
                <p className="text-sm text-zinc-600">{r.company_name ?? "—"}</p>
              </div>
              <p className="text-sm font-medium text-zinc-700">{r.status === "checked_in" ? "Checked in" : STATUS_LABELS[r.status]}</p>
            </div>
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-zinc-700 underline">Details</summary>
              <dl className="mt-2 space-y-1 text-zinc-700">
                <div><dt className="inline font-medium">Phone: </dt><dd className="inline">{r.phone ?? "—"}</dd></div>
                <div><dt className="inline font-medium">Job title: </dt><dd className="inline">{r.job_title ?? "—"}</dd></div>
                <div><dt className="inline font-medium">Ticket code: </dt><dd className="inline font-mono">{r.ticket_code ?? "—"}</dd></div>
                <div><dt className="inline font-medium">Registered: </dt><dd className="inline">{new Date(r.created_at).toISOString().replace("T", " ").slice(0, 16)} UTC</dd></div>
                {r.checked_in_at && (
                  <div><dt className="inline font-medium">Checked in: </dt><dd className="inline">{new Date(r.checked_in_at).toISOString().replace("T", " ").slice(0, 16)} UTC</dd></div>
                )}
                {Object.entries(r.custom_answers).map(([key, value]) => (
                  <div key={key}>
                    <dt className="inline font-medium">{labels.get(key) ?? key}: </dt>
                    <dd className="inline whitespace-pre-line">{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </li>
        ))}
      </ul>
      {rows.length === 500 && <p className="text-center text-xs text-zinc-500">Showing the first 500 matches. Narrow your search to see others.</p>}
    </main>
  );
}
