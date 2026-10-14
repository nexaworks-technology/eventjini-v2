import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  FileSpreadsheet,
  Handshake,
  Mail,
  Medal,
  MessagesSquare,
  Palette,
  ScanLine,
  Ticket,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
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
  title: { absolute: "EventJini — One platform for your entire event" },
  description:
    "EventJini brings organizers, delegates, sponsors and partners together: event page, registrations, QR check-in, agenda, sponsor leads, budget and vendors in one place.",
};

const PAIN = [
  { icon: FileSpreadsheet, title: "Registrations in spreadsheets", body: "Delegate lists spread across forms, sheets and inboxes, with no single source of truth." },
  { icon: Users, title: "Queues at the door", body: "Manual name checks at the entrance slow everyone down and make headcounts unreliable." },
  { icon: Medal, title: "Sponsors can't see results", body: "Without lead capture, sponsors leave with business cards and no proof of value." },
  { icon: MessagesSquare, title: "Planning across chats and sheets", body: "Agenda, budget, vendors and to-dos live in separate tools that never agree." },
];

const AUDIENCES = [
  {
    icon: ClipboardList,
    title: "Organizers",
    points: ["Branded event page and registration form", "Approvals, guest list and live check-in", "Agenda, budget, vendors and tasks", "Emails, automations and analytics"],
  },
  {
    icon: UserRound,
    title: "Delegates",
    points: ["Register in a minute, no account needed", "Instant QR ticket they can open on any phone", "Day-wise agenda and add-to-calendar", "All tickets in one place"],
  },
  {
    icon: Medal,
    title: "Sponsors",
    points: ["Clear sponsorship tiers to apply for", "Their own sponsor portal", "Scan delegate badges with consent", "Export leads with notes"],
  },
  {
    icon: Handshake,
    title: "Partners and team",
    points: ["Invite co-organizers and partners", "Roles for admins, scanners and viewers", "Door volunteers only see check-in", "Everyone works from the same data"],
  },
];

const FEATURES = [
  { icon: Palette, title: "Event page and branding", body: "A public page with your cover, colours, agenda and a clear register button." },
  { icon: ClipboardList, title: "Custom registration", body: "Add your own questions, collect business details and approve delegates." },
  { icon: Ticket, title: "QR tickets", body: "Every confirmed delegate gets a unique ticket they can open on any phone." },
  { icon: ScanLine, title: "Check-in", body: "Scan tickets with a phone camera or type the code, with live headcounts." },
  { icon: CalendarClock, title: "Agenda", body: "Sessions and speakers, grouped by day for multi-day events." },
  { icon: Medal, title: "Sponsors", body: "Sponsorship tiers, applications, a sponsor portal and lead capture." },
  { icon: Mail, title: "Communications", body: "Branded emails to your delegates, plus automated emails on key moments." },
  { icon: Wallet, title: "Budget and vendors", body: "Estimated vs actual spend by category, and every supplier's contact." },
  { icon: Building2, title: "Team and tasks", body: "Invite your team with the right role and track who is doing what." },
  { icon: BarChart3, title: "Analytics", body: "Page views, registrations and attendance in one view." },
];

const STEPS = [
  { title: "Create your event", body: "Add the title, date, location and cover image. Save it as a draft while you set things up." },
  { title: "Set up registration", body: "Add your questions, agenda and sponsor tiers, then publish when you are ready." },
  { title: "Share and check in", body: "Share the link, approve delegates and scan QR tickets at the door." },
];

const FAQ: { group: string; items: { q: string; a: string }[] }[] = [
  {
    group: "Getting started",
    items: [
      { q: "How do I create my first event?", a: "Sign up, click Create event and fill in the basics: title, date and time, location and a cover image. It is saved as a draft, so nothing goes live until you publish it." },
      { q: "Can I set up the event before it goes public?", a: "Yes. Drafts are only visible to you and your team. Add the agenda, registration questions and sponsor tiers, then publish from the event overview." },
      { q: "Can I run a multi-day event?", a: "Yes. Set the start and end dates and add agenda sessions for each day. The agenda is grouped by day on your dashboard and on the public event page." },
    ],
  },
  {
    group: "Registration and check-in",
    items: [
      { q: "Can I customize the registration form?", a: "Yes. Add text, long text, dropdown and checkbox questions, mark them as required, and ask for company and job title for business events." },
      { q: "Can I approve delegates before they get a ticket?", a: "Yes. Turn on approval and every registration waits for your review. Delegates get their QR ticket as soon as you approve them." },
      { q: "What do I need for check-in at the venue?", a: "A phone with a camera and an internet connection (Wi-Fi or mobile data). Scanning does not work offline." },
    ],
  },
  {
    group: "Sponsors and partners",
    items: [
      { q: "How do sponsors capture leads?", a: "Approved sponsors get their own portal where they scan delegate badges. Delegates choose whether their details can be shared, and sponsors can export their leads." },
      { q: "Can I give partners or volunteers limited access?", a: "Yes. Invite people as admins, scanners or viewers. Scanners only see check-in, and viewers can look but not change anything." },
    ],
  },
  {
    group: "Data and privacy",
    items: [
      { q: "Who owns the delegate data?", a: "You do. Your event and delegate data belongs to you, and you can export your guest list at any time." },
      { q: "Can delegates unsubscribe from emails?", a: "Yes. Every marketing email has an unsubscribe link, and opted-out delegates are left out of future broadcasts automatically." },
    ],
  },
];

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase", className)}>{children}</p>;
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = !!user && !user.is_anonymous;
  const primaryHref = signedIn ? "/dashboard" : "/register";
  const primaryLabel = signedIn ? "Go to my events" : "Get started";
  const cta = cn(buttonVariants({ size: "lg" }), "h-12 px-7 text-base font-semibold");

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <MarketingHeader signedIn={signedIn} />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-muted/50">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:py-20">
            <div className="space-y-6">
              <Eyebrow>Event management platform</Eyebrow>
              <h1 className="font-heading text-5xl leading-[1.04] font-bold tracking-tight text-balance sm:text-6xl">
                One platform for your entire event.
              </h1>
              <p className="max-w-md text-lg text-muted-foreground">
                From the event page and registrations to check-in, sponsor leads, agenda, budget and vendors. EventJini brings organizers, delegates, sponsors and partners together in one place.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href={primaryHref} className={cta}>{primaryLabel}</Link>
                <a href="#features" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-7 text-base font-semibold")}>See features</a>
              </div>
            </div>
            <MarketingImage name="dashboard" alt="EventJini event overview showing registrations and check-in status" width={1600} height={1000} priority fallback={<DashboardMock />} />
          </div>
        </section>

        {/* Problem */}
        <section id="product" className="mx-auto max-w-6xl scroll-mt-20 space-y-10 px-4 py-16 sm:px-6">
          <div className="max-w-2xl space-y-3">
            <Eyebrow>The problem</Eyebrow>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-balance">Running an event shouldn&apos;t mean juggling ten different tools.</h2>
          </div>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PAIN.map(({ icon: Icon, title, body }) => (
              <li key={title} className="space-y-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="size-5" aria-hidden /></span>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Who it's for */}
        <section id="solutions" className="scroll-mt-16 border-y bg-muted/30">
          <div className="mx-auto max-w-6xl space-y-10 px-4 py-16 sm:px-6">
            <div className="max-w-2xl space-y-3">
              <Eyebrow>One-stop solution</Eyebrow>
              <h2 className="font-heading text-3xl font-bold tracking-tight text-balance">Built for everyone who makes your event happen.</h2>
              <p className="text-lg text-muted-foreground">Each person gets exactly what they need, all working from the same event.</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {AUDIENCES.map(({ icon: Icon, title, points }) => (
                <li key={title} className="space-y-4 rounded-xl border bg-card p-5 text-card-foreground">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Icon className="size-5" aria-hidden /></span>
                  <h3 className="font-heading text-lg font-semibold">{title}</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {points.map((p) => (
                      <li key={p} className="flex gap-2"><span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />{p}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Feature rows */}
        <div id="features" className="mx-auto max-w-6xl scroll-mt-16 space-y-16 px-4 py-16 sm:px-6 lg:space-y-20">
          <div className="max-w-2xl space-y-3">
            <Eyebrow>Features</Eyebrow>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-balance">Everything from the first invite to the final headcount.</h2>
          </div>

          <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <MarketingImage name="form" alt="Registration form builder with approval rules" width={1400} height={900} fallback={<FormMock />} />
            <div className="space-y-3">
              <Eyebrow>Registration</Eyebrow>
              <h3 className="font-heading text-2xl font-bold tracking-tight text-balance">Custom registration forms with approvals.</h3>
              <p className="max-w-md text-lg text-muted-foreground">Ask the questions you need, collect business details, and decide who gets a ticket.</p>
            </div>
          </section>

          <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <div className="space-y-3 lg:order-first">
              <Eyebrow>Check-in</Eyebrow>
              <h3 className="font-heading text-2xl font-bold tracking-tight text-balance">QR tickets and phone-camera check-in.</h3>
              <p className="max-w-md text-lg text-muted-foreground">Delegates get a unique QR ticket. Your door team scans it with any phone and you see the live headcount.</p>
            </div>
            <MarketingImage name="checkin" alt="Delegate QR ticket being scanned at the door" width={1400} height={900} fallback={<CheckinMock />} />
          </section>

          <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <MarketingImage name="sponsors" alt="Sponsor tiers and lead tracking" width={1400} height={900} fallback={<SponsorMock />} />
            <div className="space-y-3">
              <Eyebrow>Sponsors</Eyebrow>
              <h3 className="font-heading text-2xl font-bold tracking-tight text-balance">Sponsor tiers and a lead scanner portal.</h3>
              <p className="max-w-md text-lg text-muted-foreground">Publish sponsorship tiers, review applications, and give sponsors a portal to scan delegate badges (with consent) and export their leads.</p>
            </div>
          </section>

          <ul className="grid gap-x-8 gap-y-8 border-t pt-12 sm:grid-cols-2 lg:grid-cols-5">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="space-y-2">
                <Icon className="size-5 text-primary" aria-hidden />
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
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

        {/* FAQ */}
        <section id="faq" className="border-t bg-muted/30 scroll-mt-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_2fr]">
            <div className="space-y-3">
              <Eyebrow>FAQ</Eyebrow>
              <h2 className="font-heading text-3xl font-bold tracking-tight text-balance">Frequently asked questions</h2>
              <p className="text-muted-foreground">Answers for organizers, delegates, sponsors and partners.</p>
            </div>
            <div className="space-y-8">
              {FAQ.map(({ group, items }) => (
                <div key={group} className="space-y-3">
                  <h3 className="font-heading text-sm font-semibold text-primary">{group}</h3>
                  <div className="divide-y rounded-xl border bg-card text-card-foreground">
                    {items.map((f) => (
                      <details key={f.q} className="group px-5">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                          {f.q}
                          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                        </summary>
                        <p className="pb-4 text-sm text-muted-foreground">{f.a}</p>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="bg-[oklch(0.17_0.01_60)] text-white">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <h2 className="font-heading text-3xl font-bold tracking-tight">Ready to run your next event?</h2>
              <p className="max-w-lg text-white/75">Set up your event page in minutes and bring your delegates, sponsors and team onto one platform.</p>
            </div>
            <Link href={primaryHref} className="inline-flex h-12 shrink-0 items-center rounded-lg bg-primary px-7 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90">{primaryLabel}</Link>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-6 text-sm sm:px-6">
          <Wordmark className="text-lg" />
          <span className="text-muted-foreground">One platform for organizers, delegates, sponsors and partners.</span>
          <nav aria-label="Footer" className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground">
            <a href="#solutions" className="hover:text-foreground">Who it&apos;s for</a>
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
            <Link href="/login" className="hover:text-foreground">Sign in</Link>
            <span>© {new Date().getFullYear()} EventJini</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
