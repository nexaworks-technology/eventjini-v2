import { Handshake, LayoutGrid, ScanLine, Users } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "Overview", path: "", icon: LayoutGrid },
  { key: "scan", label: "Scan", path: "/scan", icon: ScanLine },
  { key: "leads", label: "Leads", path: "/leads", icon: Users },
] as const;

/** Distinct sponsor-facing header so sponsors know they are not in the organizer workspace. */
export function SponsorPortalHeader({ id, company, eventTitle, tierName, active }: { id: string; company: string; eventTitle: string; tierName: string; active: "overview" | "scan" | "leads" }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b bg-gradient-to-r from-chart-2/12 to-transparent px-5 py-4">
        <span className="flex size-9 items-center justify-center rounded-lg bg-chart-2/15 text-[color-mix(in_oklch,var(--chart-2),var(--foreground)_30%)]">
          <Handshake className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Sponsor Portal</p>
          <p className="truncate font-heading text-lg font-semibold tracking-tight">{company}</p>
          <p className="truncate text-sm text-muted-foreground">{eventTitle} · {tierName} Sponsor</p>
        </div>
      </div>
      <nav aria-label="Sponsor portal" className="flex gap-1 overflow-x-auto px-3 py-2">
        {TABS.map(({ key, label, path, icon: Icon }) => (
          <Link
            key={key}
            href={`/dashboard/sponsor/portal/${id}${path}`}
            aria-current={active === key ? "page" : undefined}
            className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm", active === key ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
