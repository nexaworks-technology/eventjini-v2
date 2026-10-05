import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "./brand";

/** Minimal EventJini attribution for organizer-branded public pages. */
export function PoweredBy() {
  return (
    <footer className="border-t py-6 text-center text-xs text-muted-foreground">
      <Link href="/" className="inline-flex items-center gap-1.5 rounded-md hover:text-foreground">
        <BrandMark className="size-4 rounded" /> Powered by EventJini
      </Link>
    </footer>
  );
}

export function PublicSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-5 text-card-foreground sm:p-6">
      <h2 className="font-heading text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
