import { btnPrimary, btnSecondary, inputCls } from "@/components/eventjini/classes";
import { Download, Search, Users } from "lucide-react";
import { EmptyState } from "@/components/eventjini/empty-state";
import { PageHeader } from "@/components/eventjini/page-header";
import { cn } from "@/lib/utils";
import { SponsorPortalHeader } from "@/components/eventjini/sponsor-portal-header";
import { LeadNotes } from "@/components/lead-notes";
import { sanitizeSearch } from "@/lib/guests";
import { requireOwnedPortal } from "@/lib/sponsor-access";
import { LEAD_COLUMNS, type Lead } from "@/lib/sponsors";

export default async function SponsorLeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const q = sanitizeSearch((await searchParams).q);
  const { supabase, sponsor, eventTitle, tierName } = await requireOwnedPortal(id);

  let query = supabase.from("sponsor_leads").select(LEAD_COLUMNS).eq("sponsor_registration_id", id).order("captured_at", { ascending: false }).limit(500);
  if (q) {
    const p = `*${q}*`;
    query = query.or([`first_name.ilike.${p}`, `last_name.ilike.${p}`, `email.ilike.${p}`, `company_name.ilike.${p}`, `job_title.ilike.${p}`].join(","));
  }
  const [{ data }, { count }] = await Promise.all([
    query,
    supabase.from("sponsor_leads").select("id", { count: "exact", head: true }).eq("sponsor_registration_id", id),
  ]);
  const leads = (data ?? []) as Lead[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SponsorPortalHeader id={id} company={sponsor.company_name} eventTitle={eventTitle} tierName={tierName} active="leads" />

      <PageHeader
        level={2}
        title={<>Leads <span className="font-normal text-muted-foreground tabular-nums">{count ?? 0}</span></>}
        description="Only attendees who enabled sponsor lead sharing appear here."
        actions={<a href={`/api/sponsor/portal/${id}/leads.csv${q ? `?q=${encodeURIComponent(q)}` : ""}`} className={btnSecondary}><Download aria-hidden /> Export CSV</a>}
      />

      <form method="get" className="flex flex-wrap gap-2">
        <input name="q" aria-label="Search leads" defaultValue={q} placeholder="Search name, email, company or job title" className={cn(inputCls, "min-w-56 flex-1")} />
        <button type="submit" className={btnPrimary}><Search aria-hidden /> Search</button>
      </form>

      {leads.length === 0 && <EmptyState icon={Users} title={q ? "No leads match your search" : "No leads yet"} description={q ? undefined : "Scan an attendee's QR ticket to capture a lead."} />}

      <ul className="space-y-3">
        {leads.map((l) => (
          <li key={l.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{l.first_name} {l.last_name}</p>
                <p className="text-sm text-muted-foreground">{[l.company_name, l.job_title].filter(Boolean).join(" · ") || "—"}</p>
              </div>
              <p className="text-xs text-muted-foreground">{new Date(l.captured_at).toISOString().replace("T", " ").slice(0, 16)} UTC</p>
            </div>
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-foreground underline">Details &amp; notes</summary>
              <div className="mt-2 space-y-2">
                <p className="text-foreground">{l.email}</p>
                <LeadNotes sponsorId={id} leadId={l.id} initial={l.notes ?? ""} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
