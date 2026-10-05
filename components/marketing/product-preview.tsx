import { CheckCircle2, ScanLine } from "lucide-react";
import { BrandMark } from "@/components/eventjini/brand";

/** Static, illustrative product composition. Values are obviously sample data, not customer metrics. */
export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl" aria-label="Illustrative product preview with sample data" role="img">
      <div className="rounded-2xl border bg-card p-4 shadow-xl shadow-primary/5">
        <div className="flex items-center gap-2 border-b pb-3">
          <BrandMark className="size-6" />
          <span className="text-sm font-semibold">Sample Summit 2027</span>
          <span className="ml-auto rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-medium text-success ring-1 ring-success/25 ring-inset">Published</span>
        </div>
        <div className="grid grid-cols-3 gap-2 py-3">
          {[["Registrations", "120"], ["Checked in", "84"], ["Capacity", "120 / 150"]].map(([k, v]) => (
            <div key={k} className="rounded-lg border p-2.5">
              <p className="text-[10px] text-muted-foreground">{k}</p>
              <p className="text-base font-semibold tabular-nums">{v}</p>
            </div>
          ))}
        </div>
        <div className="flex h-24 items-end gap-1.5 rounded-lg border p-3" aria-hidden>
          {[30, 42, 38, 55, 61, 48, 70, 82, 76, 90, 64, 95].map((h, i) => (
            <span key={i} className="flex-1 rounded-t bg-primary/70" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <div className="absolute -bottom-6 -left-2 w-44 rounded-xl border bg-card p-3 shadow-lg sm:-left-8">
        <div className="flex items-center gap-2 text-xs font-medium"><ScanLine className="size-4 text-primary" aria-hidden /> Check-in</div>
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-success/10 p-2 text-success">
          <CheckCircle2 className="size-4" aria-hidden />
          <div className="text-[11px] leading-tight">
            <p className="font-semibold">Checked in</p>
            <p className="opacity-80">Sample Attendee</p>
          </div>
        </div>
      </div>
      <p className="mt-10 text-right text-xs text-muted-foreground">Illustrative preview · sample data</p>
    </div>
  );
}
