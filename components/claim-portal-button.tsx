"use client";

import { useState, useTransition } from "react";
import { claimSponsorPortal } from "@/app/dashboard/sponsor/portal/[id]/actions";

export function ClaimPortalButton({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-2">
      <button type="button" disabled={pending} onClick={() => startTransition(async () => { const r = await claimSponsorPortal(id); if (r && !r.ok) setError(r.error); })} className="w-full rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 disabled:opacity-60">
        {pending ? "Claiming..." : "Claim sponsor portal"}
      </button>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
