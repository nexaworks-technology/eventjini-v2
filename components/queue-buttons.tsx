"use client";

import { btnPrimary, btnSecondary } from "@/components/eventjini/classes";
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
          <button type="button" disabled={pending} onClick={() => run(() => processQueueNow(eventId))} className={btnPrimary}>
            {pending ? "Working..." : `Send ${queued} queued message${queued === 1 ? "" : "s"} now`}
          </button>
        )}
        {failed > 0 && (
          <button type="button" disabled={pending} onClick={() => run(() => retryFailed(eventId, broadcastId))} className={btnSecondary}>
            Retry {failed} failed
          </button>
        )}
      </div>
      {message && <p role="status" className="text-sm text-foreground">{message}</p>}
    </div>
  );
}
