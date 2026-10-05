import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function MetricCard({ label, value, hint, icon: Icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="rounded-xl border bg-card p-4 text-card-foreground">
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        {Icon && <Icon className="size-4" aria-hidden />}
      </div>
      <div className="mt-1 font-heading text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
