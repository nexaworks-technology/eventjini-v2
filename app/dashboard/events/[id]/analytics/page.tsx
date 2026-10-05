import { EventNav } from "@/components/event-nav";
import { requireEventAccess, TASK_READ_ROLES } from "@/lib/event-access";

type Analytics = {
  page_views: number;
  unique_visitors: number;
  registrations: number;
  approved: number;
  checked_in: number;
  pending: number;
  check_in_rate: number | null;
  by_day: { day: string; count: number }[];
  sources: { source: string; views: number; registrations: number }[];
};

const pct = (n: number) => `${n.toFixed(1)}%`;

export default async function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, event, role } = await requireEventAccess(id, TASK_READ_ROLES);

  const { data, error } = await supabase.rpc("event_analytics", { p_event_id: id });
  const a = data as Analytics | null;
  const max = a ? Math.max(1, ...a.by_day.map((d) => d.count)) : 1;

  const cards: [string, string][] = a
    ? [
        ["Page views", a.page_views.toLocaleString()],
        ["Unique visitors", a.unique_visitors.toLocaleString()],
        ["Registrations", a.registrations.toLocaleString()],
        ["Checked in", a.checked_in.toLocaleString()],
        ["Check-in rate", a.check_in_rate === null ? "—" : pct(a.check_in_rate)],
      ]
    : [];

  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-6 px-4 py-10">
      <EventNav eventId={id} eventTitle={event.title} role={role} active="analytics" />
      <h2 className="text-xl font-semibold text-zinc-900">Analytics</h2>

      {(error || !a) && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not load analytics. Please refresh and try again.
        </p>
      )}

      {a && (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {cards.map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white p-4 shadow-sm">
                <dt className="text-xs text-zinc-500">{label}</dt>
                <dd className="text-2xl font-semibold text-zinc-900">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-zinc-500">
            Check-in rate = checked in ÷ (approved + checked in): {a.checked_in} ÷ {a.approved + a.checked_in}. Page views count every visit; unique visitors count distinct visitors.
          </p>

          <section className="space-y-3 rounded-xl bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-zinc-900">Registrations over time</h3>
            {a.by_day.length === 0 ? (
              <p className="text-sm text-zinc-500">No registrations yet.</p>
            ) : (
              <div className="flex h-44 items-end gap-1" role="img" aria-label="Registrations per day">
                {a.by_day.map((d) => (
                  <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${d.day}: ${d.count}`}>
                    <span className="text-xs text-zinc-600">{d.count}</span>
                    <div className="w-full rounded-t bg-zinc-900" style={{ height: `${(d.count / max) * 100}%`, minHeight: 2 }} />
                    <span className="w-full truncate text-center text-[10px] text-zinc-500">{d.day.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-zinc-500">Days are in the event timezone ({event.timezone}).</p>
          </section>

          <section className="space-y-3 rounded-xl bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-zinc-900">Traffic sources</h3>
            {a.sources.length === 0 ? (
              <p className="text-sm text-zinc-500">No traffic recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-zinc-500">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Source</th>
                      <th className="py-2 pr-4 font-medium">Views</th>
                      <th className="py-2 pr-4 font-medium">Registrations</th>
                      <th className="py-2 font-medium">Conversion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {a.sources.map((s) => (
                      <tr key={s.source}>
                        <td className="py-2 pr-4 font-medium text-zinc-900">{s.source}</td>
                        <td className="py-2 pr-4">{s.views}</td>
                        <td className="py-2 pr-4">{s.registrations}</td>
                        <td className="py-2">{s.views === 0 || s.registrations > s.views ? "—" : pct((s.registrations / s.views) * 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-zinc-500">Registrations are attributed by last touch. Registrations with no recorded visit count as Direct; conversion shows — when it cannot be computed from recorded views.</p>
          </section>
        </>
      )}
    </main>
  );
}
