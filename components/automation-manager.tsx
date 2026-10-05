"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteAutomation,
  saveAutomation,
  setAutomationEnabled,
  type AutomationInput,
  type TriggerType,
} from "@/app/dashboard/events/[id]/automations/actions";

export type AutomationItem = {
  id: string;
  name: string;
  trigger_type: TriggerType;
  subject: string;
  body_text: string;
  enabled: boolean;
  runs: { id: string; who: string; qualified_at: string; status: string; result: string | null; delivery: string | null }[];
};

const TRIGGER_LABEL: Record<TriggerType, string> = {
  registration_approved: "When registration is approved",
  event_start_24h: "24 hours before event starts",
};
const inputCls = "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none";
const EMPTY: AutomationInput = { name: "", trigger: "registration_approved", subject: "", body: "", enabled: false };

export function AutomationManager({ eventId, items }: { eventId: string; items: AutomationItem[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<AutomationInput>(EMPTY);
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

  const formUi = (
    <div className="space-y-3 rounded-md border border-zinc-300 bg-zinc-50 p-4">
      <input className={inputCls} placeholder="Automation name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <label className="block space-y-1 text-xs text-zinc-600">
        Trigger
        <select className={inputCls} value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value as TriggerType })}>
          <option value="registration_approved">Registration approved</option>
          <option value="event_start_24h">24 hours before event start</option>
        </select>
      </label>
      <p className="text-xs text-zinc-600">Action: Send email</p>
      <input className={inputCls} placeholder="Subject, e.g. You're approved for {{event_title}}" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
      <textarea className={inputCls} rows={6} placeholder={"Hi {{first_name}},\n\n..."} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
      <p className="text-xs text-zinc-500">Variables: {"{{first_name}}"}, {"{{event_title}}"}, {"{{event_date}}"}, {"{{event_location}}"}</p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
        Enable automation (emails start sending as soon as it is saved enabled)
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => saveAutomation(eventId, editing === "new" ? null : editing, form), () => setEditing(null))}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={() => { setEditing(null); setError(null); }} className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-white">
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {items.length === 0 && editing !== "new" && <div className="rounded-xl bg-white p-8 text-center text-zinc-600 shadow-sm">No automations yet.</div>}

      {items.map((a) => (
        <div key={a.id} className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
          {editing === a.id ? (
            formUi
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-900">{a.name}</p>
                  <p className="text-sm text-zinc-600">{TRIGGER_LABEL[a.trigger_type]} → Send email</p>
                  <p className={`text-xs font-medium ${a.enabled ? "text-green-700" : "text-zinc-500"}`}>{a.enabled ? "Enabled" : "Disabled"}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <button type="button" disabled={pending} onClick={() => run(() => setAutomationEnabled(eventId, a.id, !a.enabled))} className="rounded-md border border-zinc-300 px-3 py-1 font-medium hover:bg-zinc-50">
                    {a.enabled ? "Disable" : "Enable"}
                  </button>
                  <button type="button" onClick={() => { setEditing(a.id); setForm({ name: a.name, trigger: a.trigger_type, subject: a.subject, body: a.body_text, enabled: a.enabled }); setError(null); }} className="underline">
                    Edit
                  </button>
                  <button type="button" disabled={pending} onClick={() => { if (window.confirm("Delete this automation and its run history?")) run(() => deleteAutomation(eventId, a.id)); }} className="text-red-600 underline">
                    Delete
                  </button>
                </div>
              </div>

              <details className="text-sm">
                <summary className="cursor-pointer text-zinc-700 underline">Runs ({a.runs.length})</summary>
                {a.runs.length === 0 ? (
                  <p className="mt-2 text-zinc-500">No runs yet.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-zinc-100">
                    {a.runs.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <span>
                          <span className="font-medium text-zinc-900">{r.who}</span>
                          <span className="ml-2 text-xs text-zinc-500">{new Date(r.qualified_at).toISOString().replace("T", " ").slice(0, 16)} UTC</span>
                        </span>
                        <span className="text-right text-xs text-zinc-700">
                          <span className="capitalize">{r.status}</span>
                          {r.delivery && <span> · email {r.delivery}</span>}
                          {r.result && r.status === "failed" && <span className="block text-zinc-500">{r.result}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </>
          )}
        </div>
      ))}

      {editing === "new" && formUi}
      {editing !== "new" && (
        <button type="button" onClick={() => { setEditing("new"); setForm(EMPTY); setError(null); }} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50">
          + New automation
        </button>
      )}
    </div>
  );
}
