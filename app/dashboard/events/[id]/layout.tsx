import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { EventModuleNav, EventNavSheet } from "@/components/eventjini/event-nav";
import { StatusBadge } from "@/components/eventjini/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { ADMIN_ROLES, getEventRole, ROLE_LABELS } from "@/lib/event-access";
import { UUID_RE } from "@/lib/registration";
import { createClient } from "@/utils/supabase/server";

export default async function EventWorkspaceLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return children;

  const supabase = await createClient();
  const role = await getEventRole(supabase, id);
  // No role: the page itself performs the existing redirect / not-found behavior.
  if (!role) return children;

  const { data: event } = await supabase.from("events").select("title,status,slug").eq("id", id).maybeSingle();
  if (!event) return children;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href="/dashboard/events" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" aria-hidden /> Events
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="min-w-0 font-heading text-2xl font-semibold tracking-tight break-words">{event.title}</h1>
          <StatusBadge status={event.status} />
          <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{ROLE_LABELS[role]}</span>
          <div className="ml-auto flex items-center gap-2">
            {event.status === "published" && ADMIN_ROLES.includes(role) && (
              <Link href={`/e/${event.slug}`} className={buttonVariants({ variant: "ghost", size: "lg" })}>
                View public page <ExternalLink aria-hidden />
              </Link>
            )}
            <EventNavSheet eventId={id} role={role} eventTitle={event.title} />
          </div>
        </div>
      </div>
      <div className="lg:grid lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:gap-8">
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <EventModuleNav eventId={id} role={role} />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
