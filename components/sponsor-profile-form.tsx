"use client";

import { btnPrimary, inputCls } from "@/components/eventjini/classes";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateSponsorProfile } from "@/app/dashboard/sponsor/portal/[id]/actions";


export function SponsorProfileForm({ id, companyName, logoUrl }: { id: string; companyName: string; logoUrl: string | null }) {
  const router = useRouter();
  const [name, setName] = useState(companyName);
  const [logo, setLogo] = useState(logoUrl ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <label className="block space-y-1 text-sm font-medium text-foreground">
        Company name
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block space-y-1 text-sm font-medium text-foreground">
        Logo URL
        <input className={inputCls} value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." />
      </label>
      {msg && <p role="alert" className={`rounded-md px-3 py-2 text-sm ${msg.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{msg.text}</p>}
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
        className={btnPrimary}
      >
        {pending ? "Saving..." : "Save profile"}
      </button>
    </div>
  );
}
