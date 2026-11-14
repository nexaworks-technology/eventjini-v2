"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveProfile, type ProfileInput } from "@/app/dashboard/profile/actions";
import { btnPrimary, inputCls } from "@/components/eventjini/classes";
import { FormSection } from "@/components/eventjini/form-section";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { COMPANY_SIZES, PROFILE_TEXT_MAX } from "@/lib/profile";

export function ProfileForm({ email, initial }: { email: string; initial: ProfileInput }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (k: keyof ProfileInput, value: string) => setV((p) => ({ ...p, [k]: value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        startTransition(async () => {
          const r = await saveProfile(v);
          setMsg(r.ok ? { ok: true, text: "Profile saved." } : { ok: false, text: r.error });
          if (r.ok) router.refresh();
        });
      }}
    >
      <FormSection
        title="Details"
        footer={
          <>
            <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Saving..." : "Save profile"}</button>
            {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>}
          </>
        }
      >
        <label className="block space-y-1 text-sm font-medium text-foreground">
          Email
          <input className={inputCls} value={email} disabled />
          <span className="block text-xs font-normal text-muted-foreground">Your sign-in email can&apos;t be changed here.</span>
        </label>
        <label className="block space-y-1 text-sm font-medium text-foreground">
          Full name *
          <input className={inputCls} value={v.fullName} maxLength={PROFILE_TEXT_MAX} required placeholder="e.g. Priya Sharma" onChange={(e) => set("fullName", e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm font-medium text-foreground">
          Job title
          <input className={inputCls} value={v.jobTitle} maxLength={PROFILE_TEXT_MAX} placeholder="e.g. Event Manager" onChange={(e) => set("jobTitle", e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm font-medium text-foreground">
          Company size
          <NativeSelect value={v.companySize} onChange={(e) => set("companySize", e.target.value)} className="w-full">
            <NativeSelectOption value="">Select size...</NativeSelectOption>
            {COMPANY_SIZES.map((s) => <NativeSelectOption key={s} value={s}>{s} employees</NativeSelectOption>)}
          </NativeSelect>
        </label>
      </FormSection>
    </form>
  );
}
