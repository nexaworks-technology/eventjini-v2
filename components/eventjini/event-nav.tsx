"use client";

import {
  BarChart3, CalendarClock, ClipboardList, Handshake, LayoutGrid, Mail, Menu, PiggyBank, ScanLine, Settings,
  Store, UserRoundCog, Users, Workflow, ListChecks,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ADMIN_ROLES, CHECKIN_ROLES, TASK_READ_ROLES, type EventRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

type Item = { key: string; label: string; path: string; roles: EventRole[] | null; icon: typeof Users };
const GROUPS: { label: string; items: Item[] }[] = [
  { label: "Event", items: [
    { key: "overview", label: "Overview", path: "", roles: null, icon: LayoutGrid },
    { key: "registration", label: "Registration", path: "/registration", roles: ADMIN_ROLES, icon: ClipboardList },
    { key: "guests", label: "Guests", path: "/guests", roles: ADMIN_ROLES, icon: Users },
  ] },
  { label: "Operations", items: [
    { key: "check-in", label: "Check-in", path: "/check-in", roles: CHECKIN_ROLES, icon: ScanLine },
    { key: "agenda", label: "Agenda", path: "/agenda", roles: null, icon: CalendarClock },
    { key: "tasks", label: "Tasks", path: "/tasks", roles: TASK_READ_ROLES, icon: ListChecks },
    { key: "budget", label: "Budget", path: "/budget", roles: TASK_READ_ROLES, icon: PiggyBank },
    { key: "vendors", label: "Vendors", path: "/vendors", roles: TASK_READ_ROLES, icon: Store },
  ] },
  { label: "Growth", items: [
    { key: "communications", label: "Communications", path: "/communications", roles: ADMIN_ROLES, icon: Mail },
    { key: "automations", label: "Automations", path: "/automations", roles: ADMIN_ROLES, icon: Workflow },
    { key: "analytics", label: "Analytics", path: "/analytics", roles: TASK_READ_ROLES, icon: BarChart3 },
    { key: "sponsors", label: "Sponsors", path: "/sponsors", roles: ADMIN_ROLES, icon: Handshake },
  ] },
  { label: "Manage", items: [
    { key: "team", label: "Team", path: "/team", roles: ADMIN_ROLES, icon: UserRoundCog },
    { key: "settings", label: "Settings", path: "/settings", roles: ADMIN_ROLES, icon: Settings },
  ] },
];

function useActiveKey(eventId: string) {
  const pathname = usePathname();
  const base = `/dashboard/events/${eventId}`;
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : "";
  const all = GROUPS.flatMap((g) => g.items).filter((i) => i.path);
  const hit = all.find((i) => rest === i.path || rest.startsWith(`${i.path}/`));
  if (rest === "/registrations") return "registration";
  return hit?.key ?? (rest === "" || rest === "/edit" ? "overview" : "");
}

/** Grouped event navigation. Visibility follows the existing P3 role rules; server checks remain authoritative. */
export function EventModuleNav({ eventId, role, onNavigate }: { eventId: string; role: EventRole; onNavigate?: () => void }) {
  const active = useActiveKey(eventId);
  return (
    <nav aria-label="Event" className="space-y-5">
      {GROUPS.map((g) => {
        const items = g.items.filter((i) => !i.roles || i.roles.includes(role));
        if (items.length === 0) return null;
        return (
          <div key={g.label} className="space-y-1">
            <p className="px-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{g.label}</p>
            {items.map(({ key, label, path, icon: Icon }) => (
              <Link
                key={key}
                href={`/dashboard/events/${eventId}${path}`}
                onClick={onNavigate}
                aria-current={active === key ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                  active === key ? "bg-primary/10 font-medium text-[color-mix(in_oklch,var(--primary),var(--foreground)_35%)]" : "text-foreground/80 hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            ))}
          </div>
        );
      })}
    </nav>
  );
}

export function EventNavSheet({ eventId, role, eventTitle }: { eventId: string; role: EventRole; eventTitle: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="lg" className="lg:hidden" />}>
        <Menu aria-hidden /> Event menu
      </SheetTrigger>
      <SheetContent side="left" className="w-72 overflow-y-auto">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="truncate">{eventTitle}</SheetTitle>
        </SheetHeader>
        <div className="p-3">
          <EventModuleNav eventId={eventId} role={role} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
