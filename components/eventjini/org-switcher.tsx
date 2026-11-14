"use client";

import { Check, ChevronsUpDown, Plus, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { switchOrganization } from "@/app/dashboard/org/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Organization } from "@/lib/organizations";
import { cn } from "@/lib/utils";

export function OrgLogo({ org, className }: { org: Pick<Organization, "name" | "logo_url">; className?: string }) {
  return org.logo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={org.logo_url} alt="" className={cn("size-6 shrink-0 rounded-md object-cover", className)} />
  ) : (
    <span aria-hidden className={cn("flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/12 text-xs font-semibold text-primary", className)}>
      {org.name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function OrgSwitcher({ orgs, current }: { orgs: Organization[]; current: Organization | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!current) {
    return (
      <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/org/new")}>
        <Plus aria-hidden /> Create organization
      </Button>
    );
  }

  function choose(id: string) {
    if (id === current?.id) return;
    startTransition(async () => {
      const r = await switchOrganization(id);
      if (r && !r.ok) toast.error(r.error);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="lg" className="max-w-56 gap-2 px-2" aria-label={`Organization: ${current.name}. Switch organization`} disabled={pending} />}
      >
        <OrgLogo org={current} />
        <span className="truncate text-sm font-medium">{current.name}</span>
        <ChevronsUpDown className="size-3.5 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          {orgs.map((o) => (
            <DropdownMenuItem key={o.id} onClick={() => choose(o.id)}>
              <OrgLogo org={o} className="size-5" />
              <span className="flex-1 truncate">{o.name}</span>
              {o.id === current.id && <Check aria-label="Current" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/dashboard/org")}>
          <Settings aria-hidden /> Organization settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/dashboard/org/new")}>
          <Plus aria-hidden /> New organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
