"use client";

import { useEffect, useState, useTransition } from "react";
import { countRecipients, sendBroadcast, type Segment } from "@/app/dashboard/events/[id]/communications/actions";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none";

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "approved", label: "Approved attendees" },
  { value: "pending", label: "Pending applicants" },
  { value: "checked_in", label: "Checked-in attendees" },
];

export function BroadcastComposer({ eventId, configured }: { eventId: string; configured: boolean }) {
  const [segment, setSegment] = useState<Segment>("approved");
  const [count, setCount] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [requestId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    countRecipients(eventId, segment).then((n) => {
      if (!cancelled) setCount(n);
    });
    return () => {
      cancelled = true;
    };
  }, [eventId, segment]);

  function send() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const r = await sendBroadcast(eventId, requestId, segment, subject, body);
      if (r && !r.ok) setError(r.error);
    });
  }

  return (
    <section className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
      <h2 className="font-semibold text-zinc-900">New broadcast</h2>

      {!configured && (
        <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Email sending is not configured correctly. Ask your administrator to finish the email setup.
        </p>
      )}

      <label className="block space-y-1 text-sm font-medium text-zinc-700">
        Audience
        <select
          className={inputCls}
          value={segment}
          onChange={(e) => {
            setCount(null);
            setSegment(e.target.value as Segment);
          }}
        >
          {SEGMENTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="block text-xs font-normal text-zinc-500">
          {count === null ? "Counting recipients..." : `${count} recipient${count === 1 ? "" : "s"}`}
        </span>
      </label>

      <label className="block space-y-1 text-sm font-medium text-zinc-700">
        Subject
        <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Tomorrow: {{event_title}}" />
      </label>

      <label className="block space-y-1 text-sm font-medium text-zinc-700">
        Message
        <textarea
          className={inputCls}
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={"Hi {{first_name}},\n\n{{event_title}} is on {{event_date}} at {{event_location}}.\n\nSee you there."}
        />
        <span className="block text-xs font-normal text-zinc-500">
          Variables: {"{{first_name}}"}, {"{{event_title}}"}, {"{{event_date}}"}, {"{{event_location}}"}. Plain text only.
        </span>
      </label>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          if (window.confirm(`Send this message to ${count ?? "the selected"} recipient(s)?`)) send();
        }}
        disabled={pending || !subject.trim() || !body.trim() || count === 0}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
      >
        {pending ? "Sending..." : "Send broadcast"}
      </button>
    </section>
  );
}
