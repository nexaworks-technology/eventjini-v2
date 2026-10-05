"use client";

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

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none";

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

  function remove(id: string) {
    if (!window.confirm("Delete this session?")) return;
    startTransition(async () => {
      const r = await deleteSession(eventId, id);
      setMessage(r.ok ? null : { kind: "error", text: r.error });
      router.refresh();
    });
  }

  const formUi = form && (
    <div className="space-y-3 rounded-md border border-zinc-300 bg-zinc-50 p-4">
      <input className={inputCls} placeholder="Title *" value={form.title} onChange={(e) => set("title", e.target.value)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-zinc-600">Start date *
          <input type="date" className={inputCls} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </label>
        <label className="space-y-1 text-xs text-zinc-600">Start time *
          <input type="time" className={inputCls} value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
        </label>
        <label className="space-y-1 text-xs text-zinc-600">End date *
          <input type="date" className={inputCls} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </label>
        <label className="space-y-1 text-xs text-zinc-600">End time *
          <input type="time" className={inputCls} value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
        </label>
      </div>
      <input className={inputCls} placeholder="Speaker" value={form.speaker} onChange={(e) => set("speaker", e.target.value)} />
      <textarea className={inputCls} rows={3} placeholder="Description" value={form.description} onChange={(e) => set("description", e.target.value)} />
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={pending} className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60">
          {pending ? "Saving..." : "Save session"}
        </button>
        <button type="button" onClick={() => { setEditing(null); setForm(null); setMessage(null); }} className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-white">
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {message && (
        <p role="alert" className={`rounded-md px-3 py-2 text-sm ${message.kind === "error" ? "bg-red-50 text-red-700" : message.kind === "warn" ? "bg-amber-50 text-amber-900" : "bg-green-50 text-green-800"}`}>
          {message.text}
        </p>
      )}

      {items.length === 0 && editing !== "new" && (
        <div className="rounded-xl bg-white p-8 text-center text-zinc-600 shadow-sm">No sessions yet.</div>
      )}

      {items.map((s, idx) => {
        const header = idx === 0 || items[idx - 1].dateLabel !== s.dateLabel ? <h3 className="pt-2 text-sm font-semibold text-zinc-500">{s.dateLabel}</h3> : null;
        return (
          <div key={s.id} className="space-y-2">
            {header}
            {editing === s.id ? (
              formUi
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
                <div>
                  <p className="text-sm text-zinc-500">{s.timeLabel}</p>
                  <p className="font-medium text-zinc-900">{s.title}</p>
                  {s.speaker && <p className="text-sm text-zinc-700">{s.speaker}</p>}
                  {s.description && <p className="whitespace-pre-line text-sm text-zinc-600">{s.description}</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-3 text-sm">
                    <button type="button" onClick={() => open(s.id, s.form)} className="underline">Edit</button>
                    <button type="button" onClick={() => remove(s.id)} disabled={pending} className="text-red-600 underline">Delete</button>
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
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          + Add session
        </button>
      )}
    </div>
  );
}
