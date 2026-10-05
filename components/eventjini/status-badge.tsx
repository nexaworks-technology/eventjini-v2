import { cn } from "@/lib/utils";

type Tone = "success" | "active" | "neutral" | "warning" | "danger" | "info";

const TONES: Record<Tone, string> = {
  success: "bg-success/12 text-success ring-success/25",
  active: "bg-primary/12 text-primary ring-primary/25",
  neutral: "bg-muted text-muted-foreground ring-border",
  warning: "bg-warning/15 text-[color-mix(in_oklch,var(--warning),var(--foreground)_35%)] ring-warning/30",
  danger: "bg-destructive/10 text-destructive ring-destructive/25",
  info: "bg-chart-2/12 text-[color-mix(in_oklch,var(--chart-2),var(--foreground)_30%)] ring-chart-2/25",
};

const TONE_OF: Record<string, Tone> = {
  approved: "success", completed: "success", delivered: "success", confirmed: "success", accepted: "success", succeeded: "success",
  published: "success", sales_open: "success", sent: "info",
  checked_in: "active", live: "active", pre_event: "active",
  pending: "warning", in_progress: "warning", queued: "warning", sending: "warning", processing: "warning", review: "warning", scheduled: "warning", partial_failed: "warning",
  draft: "neutral", prospect: "neutral", archived: "neutral", skipped: "neutral",
  rejected: "danger", failed: "danger", cancelled: "danger", bounced: "danger", complained: "danger", revoked: "danger", expired: "danger",
};

/** Status chip. Always shows text, so meaning never depends on colour alone. */
export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  const text = label ?? status.replace(/_/g, " ");
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset", TONES[TONE_OF[status] ?? "neutral"], className)}>
      {text}
    </span>
  );
}
