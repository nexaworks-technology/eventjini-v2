import Link from "next/link";
import { EventNav } from "@/components/event-nav";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";

export default async function SponsorsOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, event, role } = await requireEventAccess(id, ADMIN_ROLES);

  const [{ count: tiers }, { data: apps }] = await Promise.all([
    supabase.from("sponsorship_tiers").select("id", { count: "exact", head: true }).eq("event_id", id),
    supabase.from("sponsor_registrations").select("status").eq("event_id", id),
  ]);
  const c: Record<string, number> = {};
  for (const a of apps ?? []) c[a.status] = (c[a.status] ?? 0) + 1;

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-6 px-4 py-10">
      <EventNav eventId={id} eventTitle={event.title} role={role} active="sponsors" />
      <h2 className="text-xl font-semibold text-zinc-900">Sponsors</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href={`/dashboard/events/${id}/sponsors/tiers`} className="rounded-xl bg-white p-6 shadow-sm hover:bg-zinc-50">
          <p className="font-semibold text-zinc-900">Sponsorship tiers</p>
          <p className="text-sm text-zinc-600">{tiers ?? 0} tier{tiers === 1 ? "" : "s"}</p>
        </Link>
        <Link href={`/dashboard/events/${id}/sponsors/applications`} className="rounded-xl bg-white p-6 shadow-sm hover:bg-zinc-50">
          <p className="font-semibold text-zinc-900">Applications</p>
          <p className="text-sm text-zinc-600">
            Pending {c.pending ?? 0} · Approved {c.approved ?? 0} · Rejected {c.rejected ?? 0}
          </p>
        </Link>
      </div>

      {event.status === "published" && (
        <p className="text-sm text-zinc-600">
          Public page: <Link href={`/e/${event.slug}/sponsors`} className="underline">/e/{event.slug}/sponsors</Link>
        </p>
      )}
    </main>
  );
}
