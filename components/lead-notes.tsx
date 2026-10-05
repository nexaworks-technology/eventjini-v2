"use client";

import { useState, useTransition } from "react";
import { saveLeadNotes } from "@/app/dashboard/sponsor/portal/[id]/actions";

export function LeadNotes({ sponsorId, leadId, initial }: { sponsorId: string; leadId: string; initial: string }) {
  const [notes, setNotes] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-2">
      <textarea rows={3} value={notes} onChange={(e) => { setNotes(e.target.value); setMsg(null); }} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
      <div className="flex items-center gap-3">
        <button type="button" disabled={pending} onClick={() => startTransition(async () => { const r = await saveLeadNotes(sponsorId, leadId, notes); setMsg(r.ok ? "Saved." : r.error); })} className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60">Save</button>
        {msg && <span className="text-sm text-zinc-600">{msg}</span>}
      </div>
    </div>
  );
}
