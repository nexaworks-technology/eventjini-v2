import { buttonVariants } from "@/components/ui/button";

/** Shared control styling. Applied to native elements so form semantics stay exactly as they were. */
export const inputCls =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-base text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30";

export const btnPrimary = buttonVariants({ size: "lg", className: "h-9 px-3.5" });
export const btnSecondary = buttonVariants({ variant: "outline", size: "lg", className: "h-9 px-3.5" });
export const btnDanger = buttonVariants({ variant: "destructive", size: "lg", className: "h-9 px-3.5" });
export const btnPrimarySm = buttonVariants({ size: "default" });
export const btnSecondarySm = buttonVariants({ variant: "outline", size: "default" });

/** Status / filter chip used above every list and table. */
export function filterPill(active: boolean): string {
  return active
    ? "inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
    : "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground";
}
