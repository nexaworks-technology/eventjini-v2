import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

/** The single inline field-error pattern used by every form. */
export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="flex items-center gap-1 text-xs font-medium text-destructive">
      <AlertCircle className="size-3.5 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

/** Form-level message (validation summary or result). Errors are announced. */
export function FormMessage({ tone = "error", children }: { tone?: "error" | "success" | "warning"; children?: ReactNode }) {
  if (!children) return null;
  const cls =
    tone === "error"
      ? "border-destructive/30 bg-destructive/8 text-destructive"
      : tone === "success"
        ? "border-success/30 bg-success/8 text-success"
        : "border-warning/40 bg-warning/10 text-[color-mix(in_oklch,var(--warning),var(--foreground)_40%)]";
  return (
    <div role={tone === "success" ? "status" : "alert"} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${cls}`}>
      {tone === "success" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> : <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <div>{children}</div>
    </div>
  );
}
