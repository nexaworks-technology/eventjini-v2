import Link from "next/link";
import { notFound } from "next/navigation";
import { SponsorApplyForm } from "@/components/sponsor-apply-form";
import { getPublishedEvent } from "@/lib/public-event";
import type { Tier } from "@/lib/sponsors";
import { createClient } from "@/utils/supabase/server";

export default async function PublicSponsorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tier?: string }>;
}) {
  const { slug } = await params;
  const { tier } = await searchParams;
  const event = await getPublishedEvent(slug);
  if (!event) notFound();

  const supabase = await createClient();
  const { data } = await supabase.from("sponsorship_tiers").select("*").eq("event_id", event.id).order("sort_order");
  const tiers = (data ?? []) as Tier[];

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-3xl space-y-8 bg-white px-5 py-10 shadow-sm sm:px-10">
        <div className="space-y-1">
          <Link href={`/e/${event.slug}`} className="text-sm text-zinc-500 hover:underline">← {event.title}</Link>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Partner with {event.title}</h1>
        </div>

        {tiers.length === 0 ? (
          <p className="text-zinc-600">Sponsorship opportunities aren&apos;t available yet.</p>
        ) : (
          <>
            <div className="space-y-5">
              {tiers.map((t) => (
                <section key={t.id} className="space-y-2 rounded-xl border border-zinc-200 p-5">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.name}</h2>
                  {t.price_display && <p className="text-xl font-semibold text-zinc-900">{t.price_display}</p>}
                  <ul className="space-y-1 text-sm text-zinc-700">
                    {t.benefits.map((b, i) => <li key={i}>• {b}</li>)}
                  </ul>
                  <Link href={`/e/${event.slug}/sponsors?tier=${t.id}#apply`} className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
                    Apply for {t.name}
                  </Link>
                </section>
              ))}
            </div>

            <section id="apply" className="space-y-4 border-t border-zinc-100 pt-6">
              <h2 className="text-xl font-semibold text-zinc-900">Sponsor application</h2>
              <SponsorApplyForm key={tier ?? "none"} eventId={event.id} tiers={tiers} initialTierId={tier} />
            </section>
          </>
        )}
      </div>
    </main>
  );
}
