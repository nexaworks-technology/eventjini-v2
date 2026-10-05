"use client";

import { btnPrimary } from "@/components/eventjini/classes";
import { cn } from "@/lib/utils";
import { useState, useTransition } from "react";
import { claimSponsorPortal } from "@/app/dashboard/sponsor/portal/[id]/actions";

export function ClaimPortalButton({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-2">
      <button type="button" disabled={pending} onClick={() => startTransition(async () => { const r = await claimSponsorPortal(id); if (r && !r.ok) setError(r.error); })} className={cn(btnPrimary, "w-full")}>
        {pending ? "Claiming..." : "Claim sponsor portal"}
      </button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
