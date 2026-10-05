"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { decideApplication } from "@/app/dashboard/events/[id]/sponsors/applications/actions";

export function SponsorDecision({ eventId, applicationId }: { eventId: string; applicationId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(decision: "approved" | "rejected") {
    setError(null);
    startTransition(async () => {
      const r = await decideApplication(eventId, applicationId, decision);
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button type="button" disabled={pending} onClick={() => run("approved")} className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60">Approve</button>
        <button type="button" disabled={pending} onClick={() => run("rejected")} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60">Reject</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
