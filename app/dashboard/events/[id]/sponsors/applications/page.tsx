import { filterPill } from "@/components/eventjini/classes";
import { PageHeader } from "@/components/eventjini/page-header";
import Link from "next/link";
import { headers } from "next/headers";
import { StatusBadge } from "@/components/eventjini/status-badge";
import { SponsorDecision } from "@/components/sponsor-decision";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";
import type { SponsorApplication } from "@/lib/sponsors";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default async function ApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  const { status } = await searchParams;
  const { supabase } = await requireEventAccess(id, ADMIN_ROLES);

  const [{ data }, { data: tierRows }] = await Promise.all([
    supabase.from("sponsor_registrations").select("*").eq("event_id", id).order("created_at", { ascending: false }),
    supabase.from("sponsorship_tiers").select("id,name").eq("event_id", id),
  ]);
  const all = (data ?? []) as SponsorApplication[];
  const tierName = new Map((tierRows ?? []).map((t) => [t.id, t.name]));

  const counts: Record<string, number> = { all: all.length };
  for (const a of all) counts[a.status] = (counts[a.status] ?? 0) + 1;
  const active = FILTERS.some((f) => f.key === status) ? status! : "all";
  const visible = active === "all" ? all : all.filter((a) => a.status === active);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const origin = `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/dashboard/events/${id}/sponsors`} className="text-sm text-muted-foreground hover:underline">← Sponsors</Link>
        <PageHeader level={2} title={"Sponsor applications"} />
      </div>

      <nav className="flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link key={f.key} href={f.key === "all" ? `/dashboard/events/${id}/sponsors/applications` : `/dashboard/events/${id}/sponsors/applications?status=${f.key}`}
            className={filterPill(active === f.key)}>
            {f.label} {counts[f.key] ?? 0}
          </Link>
        ))}
      </nav>

      {visible.length === 0 && <div className="rounded-xl bg-card p-8 text-center text-muted-foreground shadow-sm">No applications here yet.</div>}

      <ul className="space-y-3">
        {visible.map((a) => (
          <li key={a.id} className="space-y-2 rounded-xl bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{a.company_name}</p>
                <p className="text-sm text-muted-foreground">{tierName.get(a.tier_id) ?? "Tier"}</p>
                <p className="text-sm text-foreground">{a.contact_name} · {a.contact_email}</p>
                {a.message && <p className="mt-1 whitespace-pre-line text-sm italic text-muted-foreground">&ldquo;{a.message}&rdquo;</p>}
                <div className="mt-1"><StatusBadge status={a.status} /></div>
              </div>
              {a.status === "pending" && <SponsorDecision eventId={id} applicationId={a.id} />}
            </div>
            {a.status === "approved" && (
              <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Send this portal link to {a.contact_email} (they must sign in with that email):
                <input readOnly value={`${origin}/dashboard/sponsor/portal/${a.id}`} className="mt-1 w-full rounded border border-border bg-card px-2 py-1 font-mono text-foreground" />
                <span className="mt-1 block">{a.sponsor_user_id ? "Portal claimed." : "Not claimed yet."}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
