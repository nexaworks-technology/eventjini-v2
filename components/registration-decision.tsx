"use client";

import { btnPrimarySm, btnSecondarySm } from "@/components/eventjini/classes";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveRegistration,
  rejectRegistration,
} from "@/app/dashboard/events/[id]/registrations/actions";

export function RegistrationDecision({ registrationId }: { registrationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action(registrationId);
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(approveRegistration)}
          className={btnPrimarySm}
        >
          Approve
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(rejectRegistration)}
          className={btnSecondarySm}
        >
          Reject
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
