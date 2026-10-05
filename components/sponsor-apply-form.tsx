"use client";

import { useState, useTransition, type FormEvent } from "react";
import { submitSponsorApplication, type ApplyResult } from "@/app/e/[slug]/sponsors/actions";
import type { Tier } from "@/lib/sponsors";

const inputCls = "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function SponsorApplyForm({ eventId, tiers, initialTierId }: { eventId: string; tiers: Tier[]; initialTierId?: string }) {
  const [tierId, setTierId] = useState(tiers.some((t) => t.id === initialTierId) ? initialTierId! : tiers[0]?.id ?? "");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<Extract<ApplyResult, { ok: true }> | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setFormError(null);
    const found: Record<string, string> = {};
    if (!companyName.trim()) found.companyName = "Company name is required.";
    if (!contactName.trim()) found.contactName = "Contact name is required.";
    if (!EMAIL_RE.test(contactEmail.trim())) found.contactEmail = "Enter a valid contact email.";
    setErrors(found);
    if (Object.keys(found).length) return;

    startTransition(async () => {
      const r = await submitSponsorApplication(eventId, { tierId, companyName, contactName, contactEmail, message });
      if (r.ok) setDone(r);
      else {
        if (r.field) setErrors({ [r.field]: r.error });
        else setFormError(r.error);
      }
    });
  }

  if (done) {
    return (
      <div className="space-y-2 text-center">
        <h3 className="text-lg font-semibold text-zinc-900">Application received</h3>
        <p className="text-sm text-zinc-700">Thanks for your interest in sponsoring {done.eventTitle}.</p>
        <p className="text-sm text-zinc-700">Tier: <span className="font-medium">{done.tierName}</span></p>
        <p className="text-sm text-zinc-600">The organizer will review your application.</p>
      </div>
    );
  }

  const selected = tiers.find((t) => t.id === tierId);
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <label className="block space-y-1 text-sm font-medium text-zinc-700">
        Selected tier
        <select className={inputCls} value={tierId} onChange={(e) => setTierId(e.target.value)} disabled={pending}>
          {tiers.map((t) => <option key={t.id} value={t.id}>{t.name}{t.price_display ? ` — ${t.price_display}` : ""}</option>)}
        </select>
        {selected && <span className="block text-xs font-normal text-zinc-500">Applying for {selected.name}</span>}
      </label>
      {[
        ["Company name *", companyName, setCompanyName, "companyName", "text"],
        ["Contact name *", contactName, setContactName, "contactName", "text"],
        ["Contact email *", contactEmail, setContactEmail, "contactEmail", "email"],
      ].map(([label, value, setter, key, type]) => (
        <label key={key as string} className="block space-y-1 text-sm font-medium text-zinc-700">
          {label as string}
          <input type={type as string} className={inputCls} value={value as string} disabled={pending} onChange={(e) => (setter as (v: string) => void)(e.target.value)} />
          {errors[key as string] && <span className="block text-xs font-normal text-red-600">{errors[key as string]}</span>}
        </label>
      ))}
      <label className="block space-y-1 text-sm font-medium text-zinc-700">
        Message
        <textarea className={inputCls} rows={4} value={message} disabled={pending} onChange={(e) => setMessage(e.target.value)} />
        {errors.message && <span className="block text-xs font-normal text-red-600">{errors.message}</span>}
      </label>
      {formError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 disabled:opacity-60">
        {pending ? "Submitting..." : "Submit application"}
      </button>
    </form>
  );
}
