import Link from "next/link";
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
  const { supabase, sponsor, eventTitle } = await requireOwnedPortal(id);

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
    <main className="mx-auto min-h-screen max-w-3xl space-y-6 px-4 py-10">
      <div>
        <Link href={`/dashboard/sponsor/portal/${id}`} className="text-sm text-zinc-500 hover:underline">← {sponsor.company_name}</Link>
        <p className="text-sm text-zinc-600">{eventTitle}</p>
        <h1 className="text-2xl font-semibold text-zinc-900">Leads <span className="text-zinc-500">{count ?? 0}</span></h1>
      </div>

      <div className="flex flex-wrap gap-2">
        <form method="get" className="flex min-w-64 flex-1 gap-2">
          <input name="q" defaultValue={q} placeholder="Search name, email, company or job title" className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none" />
          <button type="submit" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">Search</button>
        </form>
        <a href={`/api/sponsor/portal/${id}/leads.csv${q ? `?q=${encodeURIComponent(q)}` : ""}`} className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50">Export CSV</a>
      </div>

      {leads.length === 0 && <div className="rounded-xl bg-white p-8 text-center text-zinc-600 shadow-sm">No leads yet.</div>}

      <ul className="space-y-3">
        {leads.map((l) => (
          <li key={l.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-zinc-900">{l.first_name} {l.last_name}</p>
                <p className="text-sm text-zinc-600">{[l.company_name, l.job_title].filter(Boolean).join(" · ") || "—"}</p>
              </div>
              <p className="text-xs text-zinc-500">{new Date(l.captured_at).toISOString().replace("T", " ").slice(0, 16)} UTC</p>
            </div>
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-zinc-700 underline">Details &amp; notes</summary>
              <div className="mt-2 space-y-2">
                <p className="text-zinc-700">{l.email}</p>
                <LeadNotes sponsorId={id} leadId={l.id} initial={l.notes ?? ""} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </main>
  );
}
