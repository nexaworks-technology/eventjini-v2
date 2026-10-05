import { Download, Search, Users } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/eventjini/status-badge";
import { DataTableShell } from "@/components/eventjini/data-table-shell";
import { EmptyState } from "@/components/eventjini/empty-state";
import { FormMessage } from "@/components/eventjini/form-feedback";
import { PageHeader } from "@/components/eventjini/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { btnPrimary, btnSecondary, filterPill, inputCls } from "@/components/eventjini/classes";
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
  const { supabase } = await requireEventAccess(id, ADMIN_ROLES);

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
    <div className="max-w-4xl space-y-6">

      <PageHeader
        level={2}
        title={<>Guests <span className="font-normal text-muted-foreground tabular-nums">{counts.all}</span></>}
        description="Everyone registered for this event. Search, filter, open details or export."
        actions={<a href={exportHref} className={btnSecondary}><Download aria-hidden /> Export CSV</a>}
      />

      <DataTableShell
        toolbar={
          <>
            <form method="get" className="flex min-w-0 flex-1 flex-wrap gap-2">
              <input name="q" aria-label="Search guests" defaultValue={q} placeholder="Search name, email, company or ticket code" className={cn(inputCls, "min-w-56 flex-1")} />
              {filter !== "all" && <input type="hidden" name="status" value={filter} />}
              <button type="submit" className={btnPrimary}><Search aria-hidden /> Search</button>
              {q && (
                <Link href={qs("all").replace(/\?.*/, "") + (filter !== "all" ? `?status=${filter}` : "")} className={buttonVariants({ variant: "ghost", size: "lg" })}>
                  Clear
                </Link>
              )}
            </form>
            <nav aria-label="Filter by status" className="flex w-full flex-wrap gap-2">
              {GUEST_FILTERS.map((f) => (
                <Link key={f.key} href={qs(f.key)} aria-current={filter === f.key ? "page" : undefined} className={filterPill(filter === f.key)}>
                  {f.label} <span className="tabular-nums opacity-70">{counts[f.key] ?? 0}</span>
                </Link>
              ))}
            </nav>
          </>
        }
      >
        {error ? (
          <div className="p-4"><FormMessage>Could not load guests. Please refresh and try again.</FormMessage></div>
        ) : rows.length === 0 ? (
          <div className="p-6"><EmptyState icon={Users} title={q || filter !== "all" ? "No guests match" : "No guests yet"} description={q || filter !== "all" ? "Try a different search or filter." : "Share your event page to start collecting registrations."} /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Company</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="align-top">
                  <TableCell className="max-w-72 whitespace-normal">
                    <details className="group">
                      <summary className="cursor-pointer list-none font-medium hover:underline [&::-webkit-details-marker]:hidden">
                        {r.first_name} {r.last_name}
                        <span className="block text-xs font-normal text-muted-foreground md:hidden">{r.email}</span>
                      </summary>
                      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <dt>Phone</dt><dd className="text-foreground">{r.phone ?? "—"}</dd>
                        <dt>Job title</dt><dd className="text-foreground">{r.job_title ?? "—"}</dd>
                        <dt>Ticket</dt><dd className="font-mono text-foreground">{r.ticket_code ?? "—"}</dd>
                        <dt>Registered</dt><dd className="text-foreground">{new Date(r.created_at).toISOString().replace("T", " ").slice(0, 16)} UTC</dd>
                        {r.checked_in_at && (<><dt>Checked in</dt><dd className="text-foreground">{new Date(r.checked_in_at).toISOString().replace("T", " ").slice(0, 16)} UTC</dd></>)}
                        {Object.entries(r.custom_answers).map(([key, value]) => (
                          <div key={key} className="contents">
                            <dt>{labels.get(key) ?? key}</dt>
                            <dd className="whitespace-pre-line text-foreground">{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{r.email}</TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">{r.company_name ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={r.status} label={STATUS_LABELS[r.status]} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataTableShell>
      {rows.length === 500 && <p className="text-center text-xs text-muted-foreground">Showing the first 500 matches. Narrow your search to see others.</p>}
    </div>
  );
}
