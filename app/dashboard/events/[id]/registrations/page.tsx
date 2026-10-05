import { filterPill } from "@/components/eventjini/classes";
import { PageHeader } from "@/components/eventjini/page-header";
import Link from "next/link";
import { StatusBadge } from "@/components/eventjini/status-badge";
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
  const { supabase, event } = await requireEventAccess(id, ADMIN_ROLES);

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
    <div className="max-w-3xl space-y-6">
      <div>
        <PageHeader level={2} title={"Registrations"} description={<>
          {seats}
          {event.capacity !== null ? ` / ${event.capacity}` : ""} seats confirmed
        </>} />
      </div>

      <nav className="flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? `/dashboard/events/${id}/registrations` : `/dashboard/events/${id}/registrations?status=${f.key}`}
            className={filterPill(active === f.key)}
          >
            {f.label} {counts[f.key] ?? 0}
          </Link>
        ))}
      </nav>

      {visible.length === 0 && (
        <div className="rounded-xl bg-card p-8 text-center text-muted-foreground shadow-sm">No registrations here yet.</div>
      )}

      <ul className="space-y-3">
        {visible.map((r) => (
          <li key={r.id} className="rounded-xl bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">
                  {r.first_name} {r.last_name}
                </p>
                <p className="text-sm text-muted-foreground">{r.email}</p>
                {(r.company_name || r.job_title) && (
                  <p className="text-sm text-muted-foreground">{[r.company_name, r.job_title].filter(Boolean).join(" · ")}</p>
                )}
                <StatusBadge status={r.status} label={STATUS_LABELS[r.status]} />
              </div>
              {r.status === "pending" && <RegistrationDecision registrationId={r.id} />}
            </div>

            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-foreground underline">View application</summary>
              <dl className="mt-2 space-y-1 text-foreground">
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
    </div>
  );
}
