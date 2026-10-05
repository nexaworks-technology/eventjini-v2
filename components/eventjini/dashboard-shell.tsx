import { btnPrimary } from "@/components/eventjini/classes";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { AppNav } from "./app-nav";
import { Brand } from "./brand";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

export function DashboardShell({ email, children }: { email: string | null; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background lg:pl-60">
      <a href="#main" className={cn(btnPrimary, "sr-only z-50 focus:not-sr-only focus:fixed focus:top-2 focus:left-2")}>
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Brand href="/dashboard" />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <AppNav />
        </div>
      </aside>
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-4 lg:px-8">
        <MobileNav />
        <Brand href="/dashboard" className="lg:hidden" />
        <div className="ml-auto">
          <UserMenu email={email} />
        </div>
      </header>
      <main id="main" className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
