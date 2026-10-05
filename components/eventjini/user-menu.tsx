"use client";

import { Laptop, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/utils/supabase/client";

export function UserMenu({ email }: { email: string | null }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);
  const initials = (email ?? "?").slice(0, 2).toUpperCase();

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="lg" className="gap-2 px-1.5" aria-label="Account menu" />}>
        <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">{initials}</span>
        <span className="hidden max-w-40 truncate text-sm sm:inline">{email}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{email ?? "Signed in"}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={(v) => setTheme(String(v))}>
            <DropdownMenuRadioItem value="light"><Sun aria-hidden /> Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark"><Moon aria-hidden /> Dark</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system"><Laptop aria-hidden /> System</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} disabled={signingOut}>
          <LogOut aria-hidden /> {signingOut ? "Signing out..." : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
