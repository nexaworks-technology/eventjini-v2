import { ArrowRight, BarChart3, FileSpreadsheet, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MarketingImage } from "@/components/marketing/marketing-image";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { CheckinMock, DashboardMock, FormMock, SponsorMock } from "@/components/marketing/mocks";
import { Wordmark } from "@/components/marketing/wordmark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: { absolute: "EventJini — Run your entire event from one dashboard" },
  description: "Create your event page, collect registrations, and scan tickets at the door, all in one place.",
};

const PAIN = [
  { icon: FileSpreadsheet, title: "Spreadsheets and manual lists", body: "Registrations everywhere, no single source of truth." },
  { icon: Users, title: "Chaotic check-ins at the door", body: "Long queues, manual verification, and confusion." },
  { icon: BarChart3, title: "Sponsors getting no clear results", body: "Hard to show real value or track leads." },
];

const STEPS = [
  { title: "Create your event page", body: "Add event details, branding, and a custom registration form." },
  { title: "Share the link and collect registrations", body: "Send it to your audience and start getting registrations." },
  { title: "Scan tickets at the door", body: "Use your phone's camera to scan QR tickets and check in attendees." },
];

const FAQ = [
  { q: "Is there really no cost for pilots?", a: "Yes. The current version is completely free for selected pilot customers. No payments and no subscriptions." },
  { q: "Do scanners work offline?", a: "No. Check-in needs a stable internet connection at the venue (Wi-Fi or mobile data)." },
  { q: "Can I customize the registration form?", a: "Yes. You can create custom fields of different types and set approval workflows." },
  { q: "Who owns the attendee data?", a: "You do. All your event and attendee data belongs to you." },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">{children}</p>;
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = !!user && !user.is_anonymous;
  const primaryHref = signedIn ? "/dashboard" : "/register";
  const primaryLabel = signedIn ? "Open dashboard" : "Start free pilot";
  const cta = cn(buttonVariants({ size: "lg" }), "h-12 px-7 text-base font-semibold");

  return (
    <div className="landing flex min-h-dvh flex-col bg-background text-foreground">
      <MarketingHeader signedIn={signedIn} />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-muted/50">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:py-20">
            <div className="space-y-6">
              <Eyebrow>Event operating system</Eyebrow>
              <h1 className="font-heading text-5xl leading-[1.04] font-bold tracking-tight text-balance sm:text-6xl">
                Run your entire event from one dashboard.
              </h1>
              <p className="max-w-md text-lg text-muted-foreground">
                Create your event page, collect registrations, and scan tickets at the door, all in one place.
              </p>
              <div>
                <Link href={primaryHref} className={cta}>{primaryLabel}</Link>
              </div>
              <p className="text-sm text-muted-foreground">Free for pilot customers.<br />No payments. No subscriptions.</p>
            </div>
            <MarketingImage name="dashboard" alt="EventJini event dashboard showing registrations and check-in status" width={1600} height={1000} priority fallback={<DashboardMock />} />
          </div>
        </section>

        {/* Problem */}
        <section id="product" className="mx-auto grid max-w-6xl scroll-mt-20 gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_2fr] lg:items-center">
          <div className="space-y-3">
            <Eyebrow>For event organizers</Eyebrow>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-balance">You shouldn&apos;t have to manage your event like this.</h2>
          </div>
          <ul className="grid gap-6 sm:grid-cols-3">
            {PAIN.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="size-5" aria-hidden /></span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Feature rows */}
        <div className="mx-auto max-w-6xl space-y-16 px-4 pb-16 sm:px-6 lg:space-y-20">
          <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <MarketingImage name="form" alt="Registration form builder with approval rules" width={1400} height={900} fallback={<FormMock />} />
            <div className="space-y-3">
              <Eyebrow>Registration</Eyebrow>
              <h2 className="font-heading text-3xl font-bold tracking-tight text-balance">Custom registration forms with approval workflows.</h2>
              <p className="max-w-md text-lg text-muted-foreground">Collect the right information with custom forms, set approval rules, and manage different ticket types for your event.</p>
            </div>
          </section>

          <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <div className="space-y-3">
              <Eyebrow>Check-in</Eyebrow>
              <h2 className="font-heading text-3xl font-bold tracking-tight text-balance">QR tickets and camera-based check-in at the door.</h2>
              <p className="max-w-md text-lg text-muted-foreground">Attendees get unique QR tickets. Use your phone&apos;s camera to scan tickets and check people in quickly.</p>
            </div>
            <MarketingImage name="checkin" alt="Attendee QR ticket being scanned at the door" width={1400} height={900} fallback={<CheckinMock />} />
          </section>

          <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <MarketingImage name="sponsors" alt="Sponsor packages and lead tracking" width={1400} height={900} fallback={<SponsorMock />} />
            <div className="space-y-3">
              <Eyebrow>Sponsors</Eyebrow>
              <h2 className="font-heading text-3xl font-bold tracking-tight text-balance">Sponsor tiers and a lead scanner portal.</h2>
              <p className="max-w-md text-lg text-muted-foreground">Create sponsor packages, give sponsors their own portal to scan attendee badges (with consent), and help them track real leads from your event.</p>
            </div>
          </section>
        </div>

        {/* How it works */}
        <section className="border-t">
          <div className="mx-auto max-w-6xl space-y-8 px-4 py-14 sm:px-6">
            <Eyebrow>How it works</Eyebrow>
            <ol className="grid gap-8 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex items-start gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">{i + 1}</span>
                  <div>
                    <p className="font-semibold">{s.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                  </div>
                  {i < STEPS.length - 1 && <ArrowRight className="mt-3 ml-auto hidden size-5 shrink-0 text-muted-foreground md:block" aria-hidden />}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pilot */}
        <section id="pilot" className="scroll-mt-16 bg-neutral-950 text-white">
          <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
            <MarketingImage
              name="pilot" alt="An event crowd" width={1400} height={800} frame={false} className="hidden rounded-2xl lg:block"
              fallback={<div aria-hidden className="hidden h-40 rounded-2xl bg-[radial-gradient(circle_at_30%_30%,oklch(0.56_0.18_40/0.55),transparent_60%),radial-gradient(circle_at_80%_80%,oklch(0.56_0.18_40/0.25),transparent_55%)] lg:block" />}
            />
            <div className="space-y-4">
              <p className="text-xs font-semibold tracking-[0.14em] text-white/60 uppercase">Pilot program</p>
              <h2 className="font-heading text-3xl font-bold tracking-tight">Free for pilot customers.</h2>
              <p className="max-w-lg text-white/75">We&apos;re working with a limited number of event organizers to use EventJini for free and help us improve the product.</p>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Link href={primaryHref} className="inline-flex h-12 items-center rounded-lg bg-[oklch(0.62_0.18_42)] px-7 text-base font-semibold text-neutral-950 transition-opacity hover:opacity-90">{primaryLabel}</Link>
                <span className="text-sm text-white/60">No payments. No subscriptions.</span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-6xl scroll-mt-16 space-y-8 px-4 py-16 sm:px-6">
          <Eyebrow>Frequently asked questions</Eyebrow>
          <dl className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x">
            {FAQ.map((f) => (
              <div key={f.q} className="lg:px-6 lg:first:pl-0 lg:last:pr-0">
                <dt className="text-sm font-semibold">{f.q}</dt>
                <dd className="mt-2 text-sm text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-6 text-sm sm:px-6">
          <Wordmark className="text-lg" />
          <span className="text-muted-foreground">An event operating system for professional organizers.</span>
          <nav aria-label="Footer" className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground">
            <a href="#product" className="hover:text-foreground">Product</a>
            <a href="#pilot" className="hover:text-foreground">Pilot program</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
            <Link href="/login" className="hover:text-foreground">Sign in</Link>
            <span>© {new Date().getFullYear()} EventJini</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
