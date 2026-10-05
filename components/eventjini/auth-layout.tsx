import type { ReactNode } from "react";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";

export function AuthLayout({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <header className="flex h-14 items-center justify-between px-4 sm:px-6">
        <Brand />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-7 text-card-foreground shadow-sm">
          <div className="space-y-1 text-center">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
