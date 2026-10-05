import {
  ArrowRight, BarChart3, CalendarCog, Check, ClipboardCheck, Handshake, Mail, PiggyBank, Quote, ScanLine, Sparkles, Ticket,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/eventjini/brand";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { HeroPreview } from "@/components/marketing/product-preview";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: { absolute: "EventJini — The operating system for modern events" },
  description: "Plan, register, communicate, check in and measure your event from one place.",
};

const FEATURES = [
  { icon: Ticket, title: "Registration & ticketing", body: "Custom registration, approvals, QR tickets and attendee management." },
  { icon: ScanLine, title: "Event-day operations", body: "Guest lists, QR check-in, agenda, tasks and team roles." },
  { icon: Mail, title: "Communications", body: "Segmented broadcasts and automated attendee reminders." },
  { icon: BarChart3, title: "Analytics", body: "Track registrations, attendance, traffic sources and conversion." },
  { icon: Handshake, title: "Sponsors", body: "Sponsorship applications, partner portals and consented lead capture." },
  { icon: PiggyBank, title: "Budget & vendors", body: "Track event costs and keep your vendor operation in one place." },
];

const STEPS = [
  { title: "Create your event", body: "Set dates, branding, registration and capacity." },
  { title: "Run everything", body: "Manage guests, team, agenda, communication, sponsors and event-day check-in." },
  { title: "Measure what happened", body: "Understand registrations, attendance, acquisition and operational outcomes." },
];

const PILOT_INCLUDES = ["Event creation", "Registration & QR tickets", "Check-in & operations", "Communications", "Analytics", "Sponsor tools"];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = !!user && !user.is_anonymous;
  const primaryHref = signedIn ? "/dashboard" : "/register";
  const primaryLabel = signedIn ? "Open dashboard" : "Start free pilot";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <MarketingHeader signedIn={signedIn} />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-40 h-[32rem] bg-[radial-gradient(ellipse_at_top,var(--color-primary)_0%,transparent_60%)] opacity-[0.12]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-24">
            <div className="space-y-6">
              <p className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
                <Sparkles className="size-3.5" aria-hidden /> The operating system for B2B events
              </p>
              <h1 className="font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Run your entire event from one place.
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                Registration, check-in, attendee communication, sponsors, operations and analytics — without stitching together five different tools.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href={primaryHref} className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-base")}>
                  {primaryLabel} <ArrowRight aria-hidden />
                </Link>
                <a href="#how-it-works" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-5 text-base")}>See how it works</a>
              </div>
            </div>
            <HeroPreview />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-t bg-muted/30">
          <div className="mx-auto max-w-6xl space-y-10 px-4 py-20 sm:px-6">
            <div className="max-w-2xl space-y-3">
              <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">The operational record around the ticket</h2>
              <p className="text-muted-foreground">Everything a professional event team touches, from the first registration to the last check-in.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-xl border bg-card p-6">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" aria-hidden /></span>
                  <h3 className="mt-4 font-heading text-lg font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl space-y-10 px-4 py-20 sm:px-6">
            <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
            <ol className="grid gap-4 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative rounded-xl border bg-card p-6">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{i + 1}</span>
                  <h3 className="mt-4 font-heading text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Product preview */}
        <section className="border-y bg-muted/30">
          <div className="mx-auto max-w-6xl space-y-10 px-4 py-20 sm:px-6">
            <div className="max-w-2xl space-y-3">
              <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Everything your event team needs, without the spreadsheet maze.</h2>
              <p className="text-sm text-muted-foreground">Illustrative previews with sample data.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border bg-card p-5">
                <p className="flex items-center gap-2 text-sm font-semibold"><CalendarCog className="size-4 text-primary" aria-hidden /> Dashboard</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {["Guests", "Check-in", "Agenda", "Tasks", "Analytics"].map((x) => (
                    <li key={x} className="flex items-center justify-between rounded-lg border px-3 py-2"><span>{x}</span><ArrowRight className="size-3.5 text-muted-foreground" aria-hidden /></li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <p className="flex items-center gap-2 text-sm font-semibold"><ClipboardCheck className="size-4 text-primary" aria-hidden /> Check-in</p>
                <div className="mt-4 flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed text-muted-foreground"><ScanLine className="size-10" aria-hidden /></div>
                <p className="mt-3 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">✓ Checked in · Sample Attendee</p>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <p className="flex items-center gap-2 text-sm font-semibold"><BarChart3 className="size-4 text-primary" aria-hidden /> Analytics</p>
                <div className="mt-4 space-y-2.5 text-sm">
                  {[["Newsletter", 72], ["LinkedIn", 54], ["Direct", 31]].map(([k, v]) => (
                    <div key={k as string}>
                      <div className="flex justify-between text-xs text-muted-foreground"><span>{k}</span><span>sample</span></div>
                      <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary/70" style={{ width: `${v}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial placeholders: clearly marked; no invented customers. */}
        <section aria-labelledby="stories" className="mx-auto max-w-6xl space-y-6 px-4 py-20 sm:px-6">
          <h2 id="stories" className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">From our pilot organizers</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <figure key={n} className="rounded-xl border border-dashed bg-card/60 p-6">
                <Quote className="size-5 text-muted-foreground" aria-hidden />
                <blockquote className="mt-3 text-muted-foreground">Customer story coming soon.</blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-medium">Pilot organizer</span>
                  <span className="block text-muted-foreground">B2B Events</span>
                </figcaption>
                <p className="mt-3 inline-block rounded border px-1.5 py-0.5 text-[10px] tracking-wider text-muted-foreground uppercase">Placeholder</p>
              </figure>
            ))}
          </div>
        </section>

        {/* Pricing teaser */}
        <section id="pricing" className="scroll-mt-20 border-t bg-muted/30">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-2">
            <div className="space-y-3">
              <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Pilot access</h2>
              <p className="text-muted-foreground">Get access to the full EventJini workflow while we&apos;re working with our first organizers.</p>
              <p className="text-sm text-muted-foreground">No permanent pricing plan has been announced yet.</p>
            </div>
            <div className="rounded-2xl border bg-card p-7 shadow-sm">
              <p className="text-xs font-semibold tracking-wider text-primary uppercase">Pilot</p>
              <p className="mt-2 font-heading text-4xl font-semibold tracking-tight">Free</p>
              <p className="text-sm text-muted-foreground">during the pilot</p>
              <ul className="mt-6 space-y-2 text-sm">
                {PILOT_INCLUDES.map((x) => (
                  <li key={x} className="flex items-center gap-2"><Check className="size-4 text-primary" aria-hidden /> {x}</li>
                ))}
              </ul>
              <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "mt-7 h-11 w-full text-base")}>Join the pilot</Link>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="rounded-2xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12">
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Run your next event without the operational chaos.</h2>
            <p className="mx-auto mt-3 max-w-xl opacity-90">Create an EventJini workspace and start your pilot.</p>
            <Link href={primaryHref} className="mt-7 inline-flex h-11 items-center gap-2 rounded-lg bg-primary-foreground px-6 text-base font-semibold text-primary transition-opacity hover:opacity-90">
              {primaryLabel} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
          <div className="space-y-2">
            <p className="flex items-center gap-2 font-heading font-semibold"><BrandMark /> EventJini</p>
            <p className="text-sm text-muted-foreground">The operating system for B2B events.</p>
          </div>
          <nav aria-label="Product" className="space-y-2 text-sm">
            <p className="font-medium">Product</p>
            <a href="#features" className="block text-muted-foreground hover:text-foreground">Features</a>
            <a href="#how-it-works" className="block text-muted-foreground hover:text-foreground">How it works</a>
            <a href="#pricing" className="block text-muted-foreground hover:text-foreground">Pricing</a>
          </nav>
          <nav aria-label="Account" className="space-y-2 text-sm">
            <p className="font-medium">Account</p>
            <Link href="/login" className="block text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link href="/register" className="block text-muted-foreground hover:text-foreground">Create account</Link>
          </nav>
        </div>
        <p className="border-t py-5 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} EventJini</p>
      </footer>
    </div>
  );
}
