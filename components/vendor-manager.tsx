"use client";

import { useConfirm } from "@/components/eventjini/confirm-dialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteVendor, saveVendor, type VendorInput, type VendorStatus } from "@/app/dashboard/events/[id]/vendors/actions";
import { btnPrimary, btnSecondary, inputCls } from "@/components/eventjini/classes";
import { EmptyState } from "@/components/eventjini/empty-state";
import { StatusBadge } from "@/components/eventjini/status-badge";
import { formatMoney, toCents } from "@/lib/money";

export type Vendor = {
  id: string; name: string; category: string; contact_name: string | null; contact_email: string | null;
  contact_phone: string | null; cost: number; status: VendorStatus; notes: string | null;
};

const STATUS_LABEL: Record<VendorStatus, string> = { prospect: "Prospect", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled" };
const EMPTY: VendorInput = { name: "", category: "", contactName: "", contactEmail: "", contactPhone: "", cost: "", status: "prospect", notes: "" };

export function VendorManager({ eventId, vendors, currency, canEdit }: { eventId: string; vendors: Vendor[]; currency: string; canEdit: boolean }) {
  const confirm = useConfirm();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<VendorInput>(EMPTY);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const categories = [...new Set(vendors.map((v) => v.category))].sort();
  const visible = vendors.filter(
    (v) =>
      (!q.trim() || v.name.toLowerCase().includes(q.trim().toLowerCase())) &&
      (category === "all" || v.category === category) &&
      (status === "all" || v.status === status)
  );

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
  const set = <K extends keyof VendorInput>(k: K, v: VendorInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const formUi = (
    <div className="space-y-3 rounded-md border border-border bg-muted/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm font-medium text-foreground">Vendor name *
          <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} />{fieldErr("name")}
        </label>
        <label className="block space-y-1 text-sm font-medium text-foreground">Category *
          <input className={inputCls} list="vendor-categories" value={form.category} onChange={(e) => set("category", e.target.value)} />
          <datalist id="vendor-categories">{["Venue", "Catering", "Production", "Marketing", "Staff", "Travel", "Technology", "Speakers", "Other", ...categories].map((c) => <option key={c} value={c} />)}</datalist>
          {fieldErr("category")}
        </label>
        <label className="block space-y-1 text-sm font-medium text-foreground">Contact name
          <input className={inputCls} value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm font-medium text-foreground">Contact email
          <input type="email" className={inputCls} value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />{fieldErr("contactEmail")}
        </label>
        <label className="block space-y-1 text-sm font-medium text-foreground">Contact phone
          <input type="tel" className={inputCls} value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm font-medium text-foreground">Cost
          <input className={inputCls} inputMode="decimal" value={form.cost} onChange={(e) => set("cost", e.target.value)} />{fieldErr("cost")}
        </label>
        <label className="block space-y-1 text-sm font-medium text-foreground">Status
          <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value as VendorStatus)}>
            {(Object.keys(STATUS_LABEL) as VendorStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
      </div>
      <label className="block space-y-1 text-sm font-medium text-foreground">Notes
        <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </label>
      {error && !error.field && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error.text}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={pending} className={btnPrimary} onClick={() => run(() => saveVendor(eventId, editing === "new" ? null : editing, form), () => setEditing(null))}>{pending ? "Saving..." : "Save vendor"}</button>
        <button type="button" className={btnSecondary} onClick={() => { setEditing(null); setError(null); }}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1 space-y-1 text-xs font-medium text-muted-foreground">Search vendors
          <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Vendor name" />
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">Category
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">Status
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option>{(Object.keys(STATUS_LABEL) as VendorStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
        {canEdit && editing !== "new" && <button type="button" className={btnPrimary} onClick={() => { setEditing("new"); setForm(EMPTY); setError(null); }}>+ Add vendor</button>}
      </div>

      {editing === "new" && formUi}

      {vendors.length === 0 && editing !== "new" && (
        <EmptyState title="No vendors yet">
          <p>Keep every supplier, contact and cost for this event in one place.</p>
          {canEdit && <button type="button" className={`${btnPrimary} mt-3`} onClick={() => { setEditing("new"); setForm(EMPTY); setError(null); }}>Add vendor</button>}
        </EmptyState>
      )}
      {vendors.length > 0 && visible.length === 0 && <EmptyState title="No vendors match your filters" />}

      <ul className="space-y-3">
        {visible.map((v) => (
          <li key={v.id} className="rounded-xl bg-card p-4 shadow-sm">
            {editing === v.id ? (
              formUi
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">{v.name} <StatusBadge status={v.status} label={STATUS_LABEL[v.status]} /></p>
                  <p className="text-sm text-muted-foreground">{v.category} · {formatMoney(toCents(v.cost), currency)}</p>
                  {(v.contact_name || v.contact_email || v.contact_phone) && (
                    <p className="break-words text-sm text-muted-foreground">{[v.contact_name, v.contact_email, v.contact_phone].filter(Boolean).join(" · ")}</p>
                  )}
                  {v.notes && <p className="whitespace-pre-line text-xs text-muted-foreground">{v.notes}</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-3 text-sm">
                    <button type="button" className="underline" onClick={() => { setEditing(v.id); setError(null); setForm({ name: v.name, category: v.category, contactName: v.contact_name ?? "", contactEmail: v.contact_email ?? "", contactPhone: v.contact_phone ?? "", cost: String(v.cost), status: v.status, notes: v.notes ?? "" }); }}>Edit</button>
                    <button type="button" disabled={pending} className="text-destructive underline" onClick={async () => { if (await confirm({ title: `Delete vendor "${v.name}"?`, destructive: true })) run(() => deleteVendor(eventId, v.id)); }}>Delete</button>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {!canEdit && <p className="text-sm text-muted-foreground">You have read-only access to vendors.</p>}
    </div>
  );
}
