"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Brand, BrandMark } from "@/components/eventjini/brand";
import { ThemeToggle } from "@/components/eventjini/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
];

export function MarketingHeader({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Brand />
        <nav aria-label="Marketing" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground">{l.label}</a>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {signedIn ? (
            <Link href="/dashboard" className={buttonVariants({ size: "lg", className: "h-9 px-4" })}>Open dashboard</Link>
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ variant: "ghost", size: "lg", className: "h-9 px-3" })}>Sign in</Link>
              <Link href="/register" className={buttonVariants({ size: "lg", className: "h-9 px-4" })}>Start free</Link>
            </>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon-lg" aria-label="Open menu" />}>
              <Menu aria-hidden />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader className="border-b px-4 py-3">
                <SheetTitle className="flex items-center gap-2"><BrandMark /> EventJini</SheetTitle>
              </SheetHeader>
              <nav aria-label="Marketing mobile" className="flex flex-col gap-1 p-3">
                {LINKS.map((l) => (
                  <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm hover:bg-muted">{l.label}</a>
                ))}
              </nav>
              <div className="flex flex-col gap-2 border-t p-3">
                {signedIn ? (
                  <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }), "h-11")}>Open dashboard</Link>
                ) : (
                  <>
                    <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "h-11")}>Start free pilot</Link>
                    <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11")}>Sign in</Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
