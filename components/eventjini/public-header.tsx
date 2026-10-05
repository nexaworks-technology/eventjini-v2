import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";

/** Slim EventJini header for attendee-facing pages (tickets, auth, invites). */
export function PublicHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Brand />
        <div className="ml-auto flex items-center gap-1">
          {children}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function PublicFooterLink() {
  return (
    <p className="py-6 text-center text-xs text-muted-foreground">
      <Link href="/" className="hover:text-foreground">© EventJini</Link>
    </p>
  );
}
