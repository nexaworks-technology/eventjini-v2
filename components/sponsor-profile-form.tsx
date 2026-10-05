"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateSponsorProfile } from "@/app/dashboard/sponsor/portal/[id]/actions";

const inputCls = "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none";

export function SponsorProfileForm({ id, companyName, logoUrl }: { id: string; companyName: string; logoUrl: string | null }) {
  const router = useRouter();
  const [name, setName] = useState(companyName);
  const [logo, setLogo] = useState(logoUrl ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <label className="block space-y-1 text-sm font-medium text-zinc-700">
        Company name
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block space-y-1 text-sm font-medium text-zinc-700">
        Logo URL
        <input className={inputCls} value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." />
      </label>
      {msg && <p role="alert" className={`rounded-md px-3 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await updateSponsorProfile(id, name, logo);
            setMsg(r.ok ? { ok: true, text: "Profile saved." } : { ok: false, text: r.error });
            router.refresh();
          })
        }
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save profile"}
      </button>
    </div>
  );
}
