import { filterPill } from "@/components/eventjini/classes";
import { PageHeader } from "@/components/eventjini/page-header";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataTableShell } from "@/components/eventjini/data-table-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/eventjini/status-badge";
import { QueueButtons } from "@/components/queue-buttons";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";
import { UUID_RE } from "@/lib/registration";

type Delivery = { id: string; recipient_email: string; status: string; last_error: string | null; sent_at: string | null; delivered_at: string | null };

const FILTERS = [
  { key: "all", label: "All", match: null as string[] | null },
  { key: "delivered", label: "Delivered", match: ["delivered"] },
  { key: "sent", label: "Sent", match: ["sent"] },
  { key: "bounced", label: "Bounced", match: ["bounced", "complained"] },
  { key: "failed", label: "Failed", match: ["failed"] },
];
const SEGMENT_LABEL: Record<string, string> = { approved: "Approved attendees", pending: "Pending applicants", checked_in: "Checked-in attendees" };
const STATUS_LABEL: Record<string, string> = { queued: "Queued", sending: "Sending", sent: "Sent", delivered: "Delivered", bounced: "Bounced", complained: "Complaint", failed: "Failed" };

export default async function BroadcastDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; broadcastId: string }>;
  searchParams: Promise<{ filter?: string; sent?: string }>;
}) {
  const { id, broadcastId } = await params;
  const sp = await searchParams;
  if (!UUID_RE.test(broadcastId)) notFound();
  const { supabase } = await requireEventAccess(id, ADMIN_ROLES);

  const { data: broadcast } = await supabase
    .from("event_broadcasts")
    .select("id,subject,body_text,segment,status,recipient_count,sent_at,queued_at")
    .eq("id", broadcastId)
    .eq("event_id", id)
    .maybeSingle();
  if (!broadcast) notFound();

  const { data: all } = await supabase.from("email_deliveries").select("status").eq("broadcast_id", broadcastId);
  const counts: Record<string, number> = {};
  for (const d of all ?? []) counts[d.status] = (counts[d.status] ?? 0) + 1;

  const active = FILTERS.find((f) => f.key === sp.filter) ?? FILTERS[0];
  let q = supabase
    .from("email_deliveries")
    .select("id,recipient_email,status,last_error,sent_at,delivered_at")
    .eq("broadcast_id", broadcastId)
    .order("recipient_email")
    .limit(500);
  if (active.match) q = q.in("status", active.match);
  const { data: rows } = await q;
  const deliveries = (rows ?? []) as Delivery[];

  const bounced = (counts.bounced ?? 0) + (counts.complained ?? 0);

  return (
    <div className="max-w-3xl space-y-6">

      <div>
        <Link href={`/dashboard/events/${id}/communications`} className="text-sm text-muted-foreground hover:underline">
          ← Communications
        </Link>
        <PageHeader level={2} title={broadcast.subject} description={<>
          {SEGMENT_LABEL[broadcast.segment] ?? broadcast.segment} · <span className="capitalize">{broadcast.status.replace("_", " ")}</span>
        </>} />
      </div>

      {sp.sent === "1" && <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">Broadcast queued. Delivery status updates below.</p>}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Recipients", broadcast.recipient_count],
          ["Delivered", counts.delivered ?? 0],
          ["Sent", counts.sent ?? 0],
          ["Bounced", bounced],
          ["Failed", counts.failed ?? 0],
        ].map(([label, n]) => (
          <div key={label as string} className="rounded-xl bg-card p-4 shadow-sm">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-xl font-semibold text-foreground">{n}</dd>
          </div>
        ))}
      </dl>
      {((counts.queued ?? 0) + (counts.sending ?? 0)) > 0 && (
        <p className="text-sm text-muted-foreground">{(counts.queued ?? 0) + (counts.sending ?? 0)} message(s) still queued.</p>
      )}

      <QueueButtons eventId={id} broadcastId={broadcastId} queued={counts.queued ?? 0} failed={counts.failed ?? 0} />

      <nav className="flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? `/dashboard/events/${id}/communications/${broadcastId}` : `/dashboard/events/${id}/communications/${broadcastId}?filter=${f.key}`}
            className={filterPill(active.key === f.key)}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      <DataTableShell>
        {deliveries.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No messages match this filter.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="max-w-64 truncate">{d.recipient_email}</TableCell>
                  <TableCell><StatusBadge status={d.status} label={STATUS_LABEL[d.status] ?? d.status} /></TableCell>
                  <TableCell className="hidden text-xs whitespace-normal text-muted-foreground sm:table-cell">{d.last_error ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataTableShell>
    </div>
  );
}
