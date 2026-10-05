"use client";

import { btnPrimarySm, btnSecondarySm } from "@/components/eventjini/classes";
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
        <button type="button" disabled={pending} onClick={() => run("approved")} className={btnPrimarySm}>Approve</button>
        <button type="button" disabled={pending} onClick={() => run("rejected")} className={btnSecondarySm}>Reject</button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
