"use client";

import { useState, useTransition } from "react";
import { saveRegistrationForm, type FieldInput } from "@/app/dashboard/events/[id]/registration/actions";
import type { FieldType } from "@/lib/registration";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none";

const TYPE_LABELS: Record<FieldType, string> = {
  text: "Short text",
  long_text: "Long text",
  dropdown: "Dropdown",
  checkbox: "Checkbox",
};

type Row = {
  uid: string;
  key?: string;
  label: string;
  type: FieldType;
  required: boolean;
  optionsText: string;
};

let counter = 0;
const newUid = () => `row-${++counter}`;

export function RegistrationConfig({
  eventId,
  initialRequiresApproval,
  initialRequireB2b,
  initialFields,
}: {
  eventId: string;
  initialRequiresApproval: boolean;
  initialRequireB2b: boolean;
  initialFields: {
    field_key: string;
    label: string;
    field_type: FieldType;
    required: boolean;
    options: string[] | null;
  }[];
}) {
  const [requiresApproval, setRequiresApproval] = useState(initialRequiresApproval);
  const [requireB2b, setRequireB2b] = useState(initialRequireB2b);
  const [rows, setRows] = useState<Row[]>(
    initialFields.map((f) => ({
      uid: newUid(),
      key: f.field_key,
      label: f.label,
      type: f.field_type,
      required: f.required,
      optionsText: (f.options ?? []).join("\n"),
    }))
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  function patch(uid: string, p: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, ...p } : r)));
    setMessage(null);
  }
  function move(index: number, dir: -1 | 1) {
    setRows((rs) => {
      const j = index + dir;
      if (j < 0 || j >= rs.length) return rs;
      const copy = [...rs];
      [copy[index], copy[j]] = [copy[j], copy[index]];
      return copy;
    });
    setMessage(null);
  }

  function save() {
    setMessage(null);
    const fields: FieldInput[] = rows.map((r) => ({
      key: r.key,
      label: r.label,
      type: r.type,
      required: r.required,
      options: r.type === "dropdown" ? r.optionsText.split("\n") : [],
    }));
    startTransition(async () => {
      const result = await saveRegistrationForm(eventId, { requiresApproval, requireB2bData: requireB2b }, fields);
      setMessage(result.ok ? { kind: "ok", text: "Registration form saved." } : { kind: "error", text: result.error });
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-zinc-900">Mode</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="mode" checked={!requiresApproval} onChange={() => setRequiresApproval(false)} />
          Open registration — attendees get a ticket immediately
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="mode" checked={requiresApproval} onChange={() => setRequiresApproval(true)} />
          Approval required — you approve each application
        </label>
      </section>

      <section className="space-y-2 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-zinc-900">Standard fields</h2>
        <p className="text-sm text-zinc-600">✓ First name &nbsp; ✓ Last name &nbsp; ✓ Email &nbsp; Phone (optional)</p>
        <label className="flex items-center gap-2 pt-2 text-sm">
          <input type="checkbox" checked={requireB2b} onChange={(e) => setRequireB2b(e.target.checked)} />
          Require B2B information (company name and job title)
        </label>
      </section>

      <section className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-zinc-900">Custom questions</h2>
        {rows.length === 0 && <p className="text-sm text-zinc-500">No custom questions yet.</p>}

        {rows.map((r, i) => (
          <div key={r.uid} className="space-y-3 rounded-md border border-zinc-200 p-4">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Question {i + 1}</span>
              <span className="flex gap-3">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="underline disabled:opacity-30">
                  Move up
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="underline disabled:opacity-30">
                  Move down
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRows((rs) => rs.filter((x) => x.uid !== r.uid));
                    setMessage(null);
                  }}
                  className="text-red-600 underline"
                >
                  Remove
                </button>
              </span>
            </div>
            <input
              className={inputCls}
              placeholder="Question label"
              value={r.label}
              onChange={(e) => patch(r.uid, { label: e.target.value })}
            />
            <div className="flex flex-wrap items-center gap-4">
              <select className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm" value={r.type} onChange={(e) => patch(r.uid, { type: e.target.value as FieldType })}>
                {(Object.keys(TYPE_LABELS) as FieldType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={r.required} onChange={(e) => patch(r.uid, { required: e.target.checked })} />
                Required
              </label>
            </div>
            {r.type === "dropdown" && (
              <textarea
                className={inputCls}
                rows={4}
                placeholder={"One option per line\nCEO\nProduct"}
                value={r.optionsText}
                onChange={(e) => patch(r.uid, { optionsText: e.target.value })}
              />
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={() => {
            setRows((rs) => [...rs, { uid: newUid(), label: "", type: "text", required: false, optionsText: "" }]);
            setMessage(null);
          }}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          + Add field
        </button>
      </section>

      {message && (
        <p
          role="alert"
          className={`rounded-md px-3 py-2 text-sm ${message.kind === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}
        >
          {message.text}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save registration form"}
      </button>
    </div>
  );
}
