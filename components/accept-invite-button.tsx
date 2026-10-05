"use client";

import { useState, useTransition } from "react";
import { acceptInvite } from "@/app/invite/[token]/actions";

export function AcceptInviteButton({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await acceptInvite(token);
            if (r && !r.ok) setError(r.error);
          })
        }
        className="w-full rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
      >
        {pending ? "Accepting..." : "Accept invitation"}
      </button>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
