"use client";

import { useConfirm } from "@/components/eventjini/confirm-dialog";
import { btnPrimary, btnSecondarySm, inputCls } from "@/components/eventjini/classes";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteTier, reorderTiers, saveTier, type TierInput } from "@/app/dashboard/events/[id]/sponsors/tiers/actions";
import type { Tier } from "@/lib/sponsors";

const EMPTY: TierInput = { name: "", priceDisplay: "", benefits: [""] };

export function TierManager({ eventId, tiers }: { eventId: string; tiers: Tier[] }) {
  const confirm = useConfirm();
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<TierInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Something went wrong.");
      else after?.();
      router.refresh();
    });
  }

  function move(index: number, dir: -1 | 1) {
    const ids = tiers.map((t) => t.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    run(() => reorderTiers(eventId, ids));
  }

  const setBenefit = (i: number, v: string) => setForm((f) => ({ ...f, benefits: f.benefits.map((b, k) => (k === i ? v : b)) }));

  const formUi = (
    <div className="space-y-3 rounded-md border border-border bg-muted/40 p-4">
      <input className={inputCls} aria-label="Tier name" placeholder="Tier name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input className={inputCls} aria-label="Price display" placeholder="Price display, e.g. ₹5,00,000 or Contact us" value={form.priceDisplay} onChange={(e) => setForm({ ...form, priceDisplay: e.target.value })} />
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Benefits</p>
        {form.benefits.map((b, i) => (
          <div key={i} className="flex gap-2">
            <input className={inputCls} value={b} onChange={(e) => setBenefit(i, e.target.value)} aria-label="Benefit" placeholder="e.g. Main-stage branding" />
            <button type="button" aria-label="Remove benefit" onClick={() => setForm((f) => ({ ...f, benefits: f.benefits.filter((_, k) => k !== i) }))} className="rounded-md border border-border px-2 text-sm">
              ×
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setForm((f) => ({ ...f, benefits: [...f.benefits, ""] }))} className="text-sm underline">
          + Add benefit
        </button>
      </div>
      <div className="flex gap-2">
        <button type="button" disabled={pending} onClick={() => run(() => saveTier(eventId, editing === "new" ? null : editing, form), () => setEditing(null))} className={btnPrimary}>
          {pending ? "Saving..." : "Save tier"}
        </button>
        <button type="button" onClick={() => { setEditing(null); setError(null); }} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-card">
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {tiers.length === 0 && editing !== "new" && <div className="rounded-xl bg-card p-8 text-center text-muted-foreground shadow-sm">No tiers yet.</div>}

      {tiers.map((t, i) => (
        <div key={t.id} className="rounded-xl bg-card p-5 shadow-sm">
          {editing === t.id ? (
            formUi
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-foreground">{t.name}</p>
                {t.price_display && <p className="text-sm text-foreground">{t.price_display}</p>}
                <ul className="mt-2 space-y-0.5 text-sm text-foreground">
                  {t.benefits.map((b, k) => <li key={k}>✓ {b}</li>)}
                </ul>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <button type="button" aria-label={`Move ${t.name} up`} disabled={pending || i === 0} onClick={() => move(i, -1)} className="rounded border border-border px-2 disabled:opacity-30">↑</button>
                <button type="button" aria-label={`Move ${t.name} down`} disabled={pending || i === tiers.length - 1} onClick={() => move(i, 1)} className="rounded border border-border px-2 disabled:opacity-30">↓</button>
                <button type="button" onClick={() => { setEditing(t.id); setForm({ name: t.name, priceDisplay: t.price_display ?? "", benefits: t.benefits.length ? t.benefits : [""] }); setError(null); }} className="underline">Edit</button>
                <button type="button" disabled={pending} onClick={async () => { if (await confirm({ title: `Delete the ${t.name} tier?`, destructive: true })) run(() => deleteTier(eventId, t.id)); }} className="text-destructive underline">Delete</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {editing === "new" && formUi}
      {editing !== "new" && (
        <button type="button" onClick={() => { setEditing("new"); setForm(EMPTY); setError(null); }} className={btnSecondarySm}>
          + Add tier
        </button>
      )}
    </div>
  );
}
