"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { processQueueNow, retryFailed } from "@/app/dashboard/events/[id]/communications/actions";

export function QueueButtons({
  eventId,
  broadcastId,
  queued,
  failed,
}: {
  eventId: string;
  broadcastId: string;
  queued: number;
  failed: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; message: string }>) {
    setMessage(null);
    startTransition(async () => {
      const r = await fn();
      setMessage(r.message);
      router.refresh();
    });
  }

  if (queued === 0 && failed === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {queued > 0 && (
          <button type="button" disabled={pending} onClick={() => run(() => processQueueNow(eventId))} className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60">
            {pending ? "Working..." : `Send ${queued} queued message${queued === 1 ? "" : "s"} now`}
          </button>
        )}
        {failed > 0 && (
          <button type="button" disabled={pending} onClick={() => run(() => retryFailed(eventId, broadcastId))} className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60">
            Retry {failed} failed
          </button>
        )}
      </div>
      {message && <p role="status" className="text-sm text-zinc-700">{message}</p>}
    </div>
  );
}
