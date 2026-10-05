import { previewBrand } from "@/lib/email/preview-brand";
import { PageHeader } from "@/components/eventjini/page-header";
import Link from "next/link";
import { BroadcastComposer } from "@/components/broadcast-composer";
import { emailConfigured } from "@/lib/email/resend";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";

type Broadcast = {
  id: string;
  subject: string;
  segment: string;
  status: string;
  recipient_count: number;
  queued_at: string | null;
  sent_at: string | null;
  created_at: string;
};

const SEGMENT_LABEL: Record<string, string> = { approved: "Approved", pending: "Pending", checked_in: "Checked-in" };

export default async function CommunicationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, event } = await requireEventAccess(id, ADMIN_ROLES);

  const { data } = await supabase
    .from("event_broadcasts")
    .select("id,subject,segment,status,recipient_count,queued_at,sent_at,created_at")
    .eq("event_id", id)
    .order("created_at", { ascending: false })
    .limit(50);
  const broadcasts = (data ?? []) as Broadcast[];

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader level={2} title={"Communications"} />

      <BroadcastComposer eventId={id} configured={emailConfigured()} brand={previewBrand(event)} />

      <section className="space-y-3">
        <h3 className="font-semibold text-foreground">Broadcasts</h3>
        {broadcasts.length === 0 && <div className="rounded-xl bg-card p-6 text-center text-muted-foreground shadow-sm">No broadcasts yet.</div>}
        <ul className="space-y-3">
          {broadcasts.map((b) => (
            <li key={b.id} className="rounded-xl bg-card p-4 shadow-sm">
              <Link href={`/dashboard/events/${id}/communications/${b.id}`} className="font-medium text-foreground hover:underline">
                {b.subject}
              </Link>
              <p className="text-sm text-muted-foreground">
                {SEGMENT_LABEL[b.segment] ?? b.segment} · {b.recipient_count} recipient{b.recipient_count === 1 ? "" : "s"} ·{" "}
                <span className="capitalize">{b.status.replace("_", " ")}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {b.sent_at ? `Sent ${new Date(b.sent_at).toISOString().replace("T", " ").slice(0, 16)} UTC` : `Queued ${new Date(b.queued_at ?? b.created_at).toISOString().replace("T", " ").slice(0, 16)} UTC`}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
