"use client";

import { useConfirm } from "@/components/eventjini/confirm-dialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteBudgetItem, saveBudgetItem, type BudgetInput } from "@/app/dashboard/events/[id]/budget/actions";
import { formatMoney, toCents } from "@/lib/money";
import { btnPrimary, btnSecondary, inputCls } from "@/components/eventjini/classes";

export type BudgetItem = { id: string; category: string; name: string; estimated_amount: number; actual_amount: number; notes: string | null };

const SUGGESTIONS = ["Venue", "Catering", "Production", "Marketing", "Staff", "Travel", "Technology", "Speakers", "Other"];
const EMPTY: BudgetInput = { name: "", category: "", estimated: "", actual: "", notes: "" };

function varianceClass(c: number) {
  return c > 0 ? "text-destructive" : c < 0 ? "text-success" : "text-muted-foreground";
}
function varianceWord(c: number) {
  return c > 0 ? "over budget" : c < 0 ? "under budget" : "on budget";
}

export function BudgetManager({ eventId, items, currency, canEdit }: { eventId: string; items: BudgetItem[]; currency: string; canEdit: boolean }) {
  const confirm = useConfirm();
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<BudgetInput>(EMPTY);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const groups = new Map<string, BudgetItem[]>();
  for (const i of items) groups.set(i.category, [...(groups.get(i.category) ?? []), i]);
  const sum = (list: BudgetItem[], k: "estimated_amount" | "actual_amount") => list.reduce((a, i) => a + toCents(i[k]), 0);
  const totalEst = sum(items, "estimated_amount");
  const totalAct = sum(items, "actual_amount");

  function run(fn: () => Promise<{ ok: boolean; error?: string; field?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setError({ text: r.error ?? "Something went wrong.", field: r.field });
      else after?.();
      router.refresh();
    });
  }

  const fieldErr = (f: string) => (error?.field === f ? <span className="block text-xs text-destructive">{error.text}</span> : null);

  const formUi = (
    <div className="space-y-3 rounded-md border border-border bg-muted/40 p-4">
      <label className="block space-y-1 text-sm font-medium text-foreground">
        Item name *
        <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        {fieldErr("name")}
      </label>
      <label className="block space-y-1 text-sm font-medium text-foreground">
        Category *
        <input className={inputCls} list="budget-categories" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <datalist id="budget-categories">
          {SUGGESTIONS.map((s) => <option key={s} value={s} />)}
        </datalist>
        {fieldErr("category")}
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm font-medium text-foreground">
          Estimated cost *
          <input className={inputCls} inputMode="decimal" value={form.estimated} onChange={(e) => setForm({ ...form, estimated: e.target.value })} />
          {fieldErr("estimated")}
        </label>
        <label className="block space-y-1 text-sm font-medium text-foreground">
          Actual cost
          <input className={inputCls} inputMode="decimal" value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} />
          {fieldErr("actual")}
        </label>
      </div>
      <label className="block space-y-1 text-sm font-medium text-foreground">
        Notes
        <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </label>
      {error && !error.field && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error.text}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={pending} className={btnPrimary} onClick={() => run(() => saveBudgetItem(eventId, editing === "new" ? null : editing, form), () => setEditing(null))}>
          {pending ? "Saving..." : "Save item"}
        </button>
        <button type="button" className={btnSecondary} onClick={() => { setEditing(null); setError(null); }}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-card p-4 shadow-sm"><dt className="text-xs text-muted-foreground">Estimated</dt><dd className="text-2xl font-semibold text-foreground">{formatMoney(totalEst, currency)}</dd></div>
        <div className="rounded-xl bg-card p-4 shadow-sm"><dt className="text-xs text-muted-foreground">Actual</dt><dd className="text-2xl font-semibold text-foreground">{formatMoney(totalAct, currency)}</dd></div>
        <div className="rounded-xl bg-card p-4 shadow-sm">
          <dt className="text-xs text-muted-foreground">Variance (actual − estimated)</dt>
          <dd className={`text-2xl font-semibold ${varianceClass(totalAct - totalEst)}`}>
            {formatMoney(totalAct - totalEst, currency, true)}
            <span className="ml-2 text-xs font-medium">{varianceWord(totalAct - totalEst)}</span>
          </dd>
        </div>
      </dl>

      {error && !error.field && editing === null && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error.text}</p>}

      {items.length === 0 && editing !== "new" && (
        <div className="space-y-3 rounded-xl bg-card p-8 text-center shadow-sm">
          <p className="font-medium text-foreground">No budget items yet</p>
          <p className="text-sm text-muted-foreground">Add line items to compare estimated and actual costs.</p>
          {canEdit && <button type="button" className={btnPrimary} onClick={() => { setEditing("new"); setForm(EMPTY); setError(null); }}>Add first budget item</button>}
        </div>
      )}

      {[...groups.entries()].map(([category, list]) => {
        const e = sum(list, "estimated_amount");
        const a = sum(list, "actual_amount");
        return (
          <section key={category} className="space-y-3 rounded-xl bg-card p-5 shadow-sm">
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold text-foreground">{category}</h2>
              <p className="text-sm text-muted-foreground">
                Est. {formatMoney(e, currency)} · Actual {formatMoney(a, currency)} ·{" "}
                <span className={`font-medium ${varianceClass(a - e)}`}>{formatMoney(a - e, currency, true)} {varianceWord(a - e)}</span>
              </p>
            </header>
            <ul className="divide-y divide-border">
              {list.map((i) => {
                const v = toCents(i.actual_amount) - toCents(i.estimated_amount);
                return (
                  <li key={i.id} className="py-3">
                    {editing === i.id ? (
                      formUi
                    ) : (
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{i.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Est. {formatMoney(toCents(i.estimated_amount), currency)} · Actual {formatMoney(toCents(i.actual_amount), currency)} ·{" "}
                            <span className={`font-medium ${varianceClass(v)}`}>{formatMoney(v, currency, true)} ({varianceWord(v)})</span>
                          </p>
                          {i.notes && <p className="whitespace-pre-line text-xs text-muted-foreground">{i.notes}</p>}
                        </div>
                        {canEdit && (
                          <div className="flex gap-3 text-sm">
                            <button type="button" className="underline" onClick={() => { setEditing(i.id); setError(null); setForm({ name: i.name, category: i.category, estimated: String(i.estimated_amount), actual: String(i.actual_amount), notes: i.notes ?? "" }); }}>Edit</button>
                            <button type="button" disabled={pending} className="text-destructive underline" onClick={async () => { if (await confirm({ title: `Delete "${i.name}"?`, destructive: true })) run(() => deleteBudgetItem(eventId, i.id)); }}>Delete</button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {editing === "new" && formUi}
      {canEdit && editing !== "new" && items.length > 0 && (
        <button type="button" className={btnSecondary} onClick={() => { setEditing("new"); setForm(EMPTY); setError(null); }}>+ Add budget item</button>
      )}
      {!canEdit && <p className="text-sm text-muted-foreground">You have read-only access to the budget.</p>}
    </div>
  );
}
