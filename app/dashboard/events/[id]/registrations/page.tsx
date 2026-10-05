import Link from "next/link";
import { EventNav } from "@/components/event-nav";
import { RegistrationDecision } from "@/components/registration-decision";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";
import {
  STATUS_LABELS,
  type RegistrationField,
  type RegistrationRow,
  type RegistrationStatus,
} from "@/lib/registration";

const FILTERS: { key: "all" | RegistrationStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "cancelled", label: "Cancelled" },
];

export default async function RegistrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  const { status } = await searchParams;
  const { supabase, event, role } = await requireEventAccess(id, ADMIN_ROLES);

  const [{ data: regData }, { data: fieldData }] = await Promise.all([
    supabase.from("registrations").select("*").eq("event_id", id).order("created_at", { ascending: false }),
    supabase.from("event_registration_fields").select("*").eq("event_id", id).order("sort_order"),
  ]);
  const all = (regData ?? []) as RegistrationRow[];
  const labels = new Map(((fieldData ?? []) as RegistrationField[]).map((f) => [f.field_key, f.label]));

  const counts: Record<string, number> = { all: all.length };
  for (const r of all) counts[r.status] = (counts[r.status] ?? 0) + 1;

  const active = FILTERS.some((f) => f.key === status) ? (status as "all" | RegistrationStatus) : "all";
  const visible = active === "all" ? all : all.filter((r) => r.status === active);
  const seats = (counts.approved ?? 0) + (counts.checked_in ?? 0);

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-6 px-4 py-10">
      <EventNav eventId={id} eventTitle={event.title} role={role} active="registration" />
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Registrations</h2>
        <p className="text-sm text-zinc-600">
          {seats}
          {event.capacity !== null ? ` / ${event.capacity}` : ""} seats confirmed
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? `/dashboard/events/${id}/registrations` : `/dashboard/events/${id}/registrations?status=${f.key}`}
            className={`rounded-full px-3 py-1 ${active === f.key ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}
          >
            {f.label} {counts[f.key] ?? 0}
          </Link>
        ))}
      </nav>

      {visible.length === 0 && (
        <div className="rounded-xl bg-white p-8 text-center text-zinc-600 shadow-sm">No registrations here yet.</div>
      )}

      <ul className="space-y-3">
        {visible.map((r) => (
          <li key={r.id} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-zinc-900">
                  {r.first_name} {r.last_name}
                </p>
                <p className="text-sm text-zinc-600">{r.email}</p>
                {(r.company_name || r.job_title) && (
                  <p className="text-sm text-zinc-600">{[r.company_name, r.job_title].filter(Boolean).join(" · ")}</p>
                )}
                <p className="text-xs font-medium text-zinc-500">{STATUS_LABELS[r.status]}</p>
              </div>
              {r.status === "pending" && <RegistrationDecision registrationId={r.id} />}
            </div>

            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-zinc-700 underline">View application</summary>
              <dl className="mt-2 space-y-1 text-zinc-700">
                <div><dt className="inline font-medium">Phone: </dt><dd className="inline">{r.phone ?? "—"}</dd></div>
                <div><dt className="inline font-medium">Submitted: </dt><dd className="inline">{new Date(r.created_at).toISOString().replace("T", " ").slice(0, 16)} UTC</dd></div>
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
    </main>
  );
}
