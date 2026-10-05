"use client";

import { useConfirm } from "@/components/eventjini/confirm-dialog";
import { btnPrimary, btnSecondarySm, inputCls } from "@/components/eventjini/classes";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSession, saveSession, type SessionInput } from "@/app/dashboard/events/[id]/agenda/actions";

export type AgendaItem = {
  id: string;
  title: string;
  description: string | null;
  speaker: string | null;
  dateLabel: string;
  timeLabel: string;
  form: SessionInput;
};


export function AgendaEditor({
  eventId,
  items,
  canEdit,
  defaultDate,
}: {
  eventId: string;
  items: AgendaItem[];
  canEdit: boolean;
  defaultDate: string;
}) {
  const confirm = useConfirm();
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<SessionInput | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "warn" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function open(id: string | "new", initial: SessionInput) {
    setEditing(id);
    setForm(initial);
    setMessage(null);
  }
  function set<K extends keyof SessionInput>(k: K, v: string) {
    setForm((f) => (f ? { ...f, [k]: v } : f));
  }

  function save() {
    if (!form) return;
    startTransition(async () => {
      const r = await saveSession(eventId, editing === "new" ? null : editing, form);
      if (!r.ok) {
        setMessage({ kind: "error", text: r.error });
        return;
      }
      setMessage(r.warning ? { kind: "warn", text: r.warning } : null);
      setEditing(null);
      setForm(null);
      router.refresh();
    });
  }

  async function remove(id: string) {
    if (!await confirm({ title: "Delete this session?", destructive: true })) return;
    startTransition(async () => {
      const r = await deleteSession(eventId, id);
      setMessage(r.ok ? null : { kind: "error", text: r.error });
      router.refresh();
    });
  }

  const formUi = form && (
    <div className="space-y-3 rounded-md border border-border bg-muted/40 p-4">
      <input className={inputCls} aria-label="Session title" placeholder="Title *" value={form.title} onChange={(e) => set("title", e.target.value)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-muted-foreground">Start date *
          <input type="date" className={inputCls} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">Start time *
          <input type="time" className={inputCls} value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">End date *
          <input type="date" className={inputCls} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">End time *
          <input type="time" className={inputCls} value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
        </label>
      </div>
      <input className={inputCls} aria-label="Speaker" placeholder="Speaker" value={form.speaker} onChange={(e) => set("speaker", e.target.value)} />
      <textarea className={inputCls} rows={3} aria-label="Session description" placeholder="Description" value={form.description} onChange={(e) => set("description", e.target.value)} />
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={pending} className={btnPrimary}>
          {pending ? "Saving..." : "Save session"}
        </button>
        <button type="button" onClick={() => { setEditing(null); setForm(null); setMessage(null); }} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-card">
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {message && (
        <p role="alert" className={`rounded-md px-3 py-2 text-sm ${message.kind === "error" ? "bg-destructive/10 text-destructive" : message.kind === "warn" ? "bg-warning/10 text-foreground" : "bg-success/10 text-success"}`}>
          {message.text}
        </p>
      )}

      {items.length === 0 && editing !== "new" && (
        <div className="rounded-xl bg-card p-8 text-center text-muted-foreground shadow-sm">No sessions yet.</div>
      )}

      {items.map((s, idx) => {
        const header = idx === 0 || items[idx - 1].dateLabel !== s.dateLabel ? <h3 className="pt-2 text-sm font-semibold text-muted-foreground">{s.dateLabel}</h3> : null;
        return (
          <div key={s.id} className="space-y-2">
            {header}
            {editing === s.id ? (
              formUi
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-card p-4 shadow-sm">
                <div>
                  <p className="text-sm text-muted-foreground">{s.timeLabel}</p>
                  <p className="font-medium text-foreground">{s.title}</p>
                  {s.speaker && <p className="text-sm text-foreground">{s.speaker}</p>}
                  {s.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{s.description}</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-3 text-sm">
                    <button type="button" onClick={() => open(s.id, s.form)} className="underline">Edit</button>
                    <button type="button" onClick={() => remove(s.id)} disabled={pending} className="text-destructive underline">Delete</button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {canEdit && editing === "new" && formUi}
      {canEdit && editing !== "new" && (
        <button
          type="button"
          onClick={() => open("new", { title: "", description: "", speaker: "", startDate: defaultDate, startTime: "", endDate: defaultDate, endTime: "" })}
          className={btnSecondarySm}
        >
          + Add session
        </button>
      )}
    </div>
  );
}
