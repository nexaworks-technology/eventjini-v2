"use client";

import { btnPrimary } from "@/components/eventjini/classes";
import { useState, useTransition } from "react";
import { publishEvent } from "@/app/dashboard/events/actions";

export function PublishButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await publishEvent(eventId);
            if (result && !result.ok) setError(result.error);
          })
        }
        className={btnPrimary}
      >
        {pending ? "Publishing..." : "Publish event"}
      </button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
