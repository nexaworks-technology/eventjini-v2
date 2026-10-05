import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("relative flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground", className)}>
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
        <rect x="5" y="4" width="3" height="16" rx="1" />
        <rect x="5" y="4" width="12" height="3" rx="1" />
        <rect x="5" y="10.5" width="10" height="3" rx="1" />
        <rect x="5" y="17" width="12" height="3" rx="1" />
      </svg>
      <span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-foreground ring-2 ring-background" />
    </span>
  );
}

export function Brand({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 rounded-md font-heading text-base font-semibold tracking-tight", className)}>
      <BrandMark />
      EventJini
    </Link>
  );
}
