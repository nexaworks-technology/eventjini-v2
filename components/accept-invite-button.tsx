"use client";

import { btnPrimary } from "@/components/eventjini/classes";
import { cn } from "@/lib/utils";
import { useState, useTransition } from "react";
import { acceptInvite } from "@/app/invite/[token]/actions";

type Accept = (token: string) => Promise<{ ok: false; error: string }>;

export function AcceptInviteButton({ token, accept = acceptInvite }: { token: string; accept?: Accept }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await accept(token);
            if (r && !r.ok) setError(r.error);
          })
        }
        className={cn(btnPrimary, "w-full")}
      >
        {pending ? "Accepting..." : "Accept invitation"}
      </button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
