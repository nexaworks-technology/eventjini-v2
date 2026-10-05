"use client";

import { useState, useTransition } from "react";
import { setLeadConsent } from "@/app/tickets/actions";

export function LeadConsentToggle({ registrationId, initial }: { registrationId: string; initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(next: boolean) {
    const previous = enabled;
    setEnabled(next);
    setError(null);
    startTransition(async () => {
      const r = await setLeadConsent(registrationId, next);
      if (!r.ok) {
        setEnabled(previous);
        setError(r.error ?? "Could not update your preference.");
      }
    });
  }

  return (
    <div className="space-y-1 rounded-md border border-zinc-200 p-3 text-left">
      <p className="text-sm font-medium text-zinc-900">Sponsor lead sharing</p>
      <label className="flex items-start gap-2 text-xs text-zinc-600">
        <input type="checkbox" className="mt-0.5" checked={enabled} disabled={pending} onChange={(e) => toggle(e.target.checked)} />
        <span>Allow exhibitors/sponsors I interact with to receive my name, email, company and job title when I present my QR code.</span>
      </label>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
