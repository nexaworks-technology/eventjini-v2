import { ArrowLeft, Check, Handshake } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/eventjini/empty-state";
import { PoweredBy } from "@/components/eventjini/public-event-chrome";
import { SponsorApplyForm } from "@/components/sponsor-apply-form";
import { eventBrandStyle } from "@/lib/branding";
import { getPublishedEvent } from "@/lib/public-event";
import type { Tier } from "@/lib/sponsors";
import { createClient } from "@/utils/supabase/server";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const event = await getPublishedEvent((await params).slug);
  return { title: event ? `Sponsor · ${event.title}` : "Event not found" };
}

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
    <div className="min-h-dvh bg-background" style={eventBrandStyle(event.primary_color, event.accent_color)}>
      <header className="event-hero">
        <div className="mx-auto max-w-4xl space-y-3 px-5 py-10 sm:px-6">
          <Link href={`/e/${event.slug}`} className="inline-flex items-center gap-1 text-sm opacity-85 hover:opacity-100">
            <ArrowLeft className="size-3.5" aria-hidden /> {event.title}
          </Link>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Partner with {event.title}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        {tiers.length === 0 ? (
          <EmptyState icon={Handshake} title="Sponsorship opportunities aren't available yet." />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {tiers.map((t) => (
                <section key={t.id} className="flex flex-col gap-4 rounded-xl border bg-card p-6 text-card-foreground">
                  <div className="space-y-1">
                    <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{t.name}</h2>
                    {t.price_display && <p className="font-heading text-2xl font-semibold tracking-tight">{t.price_display}</p>}
                  </div>
                  {t.benefits.length > 0 && (
                    <ul className="space-y-1.5 text-sm">
                      {t.benefits.map((b, i) => (
                        <li key={i} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0" style={{ color: "var(--event-primary)" }} aria-hidden /> {b}</li>
                      ))}
                    </ul>
                  )}
                  <Link href={`/e/${event.slug}/sponsors?tier=${t.id}#apply`} className="event-cta mt-auto inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold">
                    Apply for {t.name}
                  </Link>
                </section>
              ))}
            </div>

            <section id="apply" className="scroll-mt-6 space-y-4">
              <h2 className="font-heading text-xl font-semibold tracking-tight">Sponsor application</h2>
              <div className="rounded-xl border bg-card p-5 sm:p-6">
                <SponsorApplyForm key={tier ?? "none"} eventId={event.id} tiers={tiers} initialTierId={tier} />
              </div>
            </section>
          </>
        )}
      </main>
      <PoweredBy />
    </div>
  );
}
