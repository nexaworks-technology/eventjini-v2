"use client";

import { btnPrimary } from "@/components/eventjini/classes";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { OFFLINE_MESSAGE, useOnline } from "@/lib/use-online";
import { captureLead, saveLeadNotes, type CaptureOutcome } from "@/app/dashboard/sponsor/portal/[id]/actions";

const READER_ID = "ej-sponsor-reader";
const MESSAGES: Record<string, string> = {
  not_found: "Attendee ticket not found.",
  wrong_event: "This ticket is not valid for this event.",
  not_active: "This attendee's ticket is not active.",
  no_consent: "This attendee has not enabled sponsor lead sharing.",
  unauthorized: "Sponsor portal not found.",
  error: "Something went wrong. Please try again.",
};

export function SponsorScanner({ sponsorId }: { sponsorId: string }) {
  const [camera, setCamera] = useState<"idle" | "starting" | "running" | "denied" | "unavailable">("idle");
  const [outcome, setOutcome] = useState<CaptureOutcome | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [noteMsg, setNoteMsg] = useState<string | null>(null);
  const online = useOnline();
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const handling = useRef(false);

  async function submit(raw: string) {
    if (handling.current || !navigator.onLine) return;
    handling.current = true;
    setBusy(true);
    setNoteMsg(null);
    try {
      const r = await captureLead(sponsorId, raw);
      setOutcome(r);
      setNotes("lead" in r ? r.lead.notes ?? "" : "");
      setCode("");
    } catch {
      setOutcome({ result: "error" });
    } finally {
      setBusy(false);
      handling.current = false;
    }
  }

  async function start() {
    setCamera("starting");
    setOutcome(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const s = new Html5Qrcode(READER_ID);
      scannerRef.current = s;
      await s.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 } }, (text) => {
        if (handling.current || !navigator.onLine) return;
        void submit(text);
        try { s.pause(true); } catch {}
      }, () => {});
      setCamera("running");
    } catch (e) {
      const n = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      setCamera(/denied|NotAllowed|Permission/i.test(n) ? "denied" : "unavailable");
      scannerRef.current = null;
    }
  }

  async function stop() {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) { try { await s.stop(); s.clear(); } catch {} }
    setCamera("idle");
  }

  useEffect(() => () => {
    const s = scannerRef.current;
    if (s) s.stop().then(() => s.clear()).catch(() => {});
  }, []);

  function onManual(e: FormEvent) {
    e.preventDefault();
    if (code.trim() && !busy) void submit(code);
  }

  const lead = outcome && "lead" in outcome ? outcome.lead : null;

  return (
    <div className="space-y-6">
      {!online && (
        <p role="alert" className="rounded-md bg-warning/10 px-4 py-3 text-sm font-medium text-foreground">
          {OFFLINE_MESSAGE}
        </p>
      )}
      <section className="space-y-4 rounded-xl bg-card p-6 shadow-sm">
        <div id={READER_ID} className="w-full overflow-hidden rounded-md" />
        {camera === "idle" && <button type="button" onClick={start} className={cn(btnPrimary, "h-auto w-full py-4 text-lg")}>Start camera</button>}
        {camera === "starting" && <p className="text-center text-muted-foreground">Starting camera...</p>}
        {camera === "running" && (
          <div className="space-y-1 text-center">
            <p className="text-sm text-muted-foreground">Scan the attendee&apos;s EventJini QR code</p>
            <button type="button" onClick={stop} className="text-sm text-muted-foreground underline">Stop camera</button>
          </div>
        )}
        {(camera === "denied" || camera === "unavailable") && (
          <div role="alert" className="space-y-2 rounded-md bg-warning/10 px-4 py-3 text-sm text-foreground">
            <p className="font-medium">{camera === "denied" ? "Camera access was denied." : "The camera could not be started."}</p>
            <p>You can enter the ticket code manually.</p>
            <button type="button" onClick={start} className="underline">Try camera again</button>
          </div>
        )}

        {outcome && (
          <div role="status" className={`space-y-2 rounded-md px-4 py-5 ${lead ? (outcome.result === "captured" ? "bg-success/10 text-success" : "bg-warning/10 text-foreground") : "bg-destructive/10 text-destructive"}`}>
            {lead ? (
              <>
                <p className="text-xl font-semibold">{outcome.result === "captured" ? "Lead captured ✓" : "Lead already captured"}</p>
                <p className="text-lg font-medium">{lead.first_name} {lead.last_name}</p>
                {lead.company_name && <p>{lead.company_name}</p>}
                {lead.job_title && <p>{lead.job_title}</p>}
                <p className="text-sm">{lead.email}</p>
                <label className="block space-y-1 pt-2 text-sm font-medium">
                  Notes
                  <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-md border border-border bg-card px-3 py-2 text-foreground" />
                </label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={async () => { const r = await saveLeadNotes(sponsorId, lead.id, notes); setNoteMsg(r.ok ? "Notes saved." : r.error); }} className={btnPrimary}>Save notes</button>
                  {camera === "running" && <button type="button" onClick={() => { setOutcome(null); try { scannerRef.current?.resume(); } catch {} }} className="rounded-md border border-input px-4 py-2 text-sm font-medium">Scan next</button>}
                </div>
                {noteMsg && <p className="text-sm">{noteMsg}</p>}
              </>
            ) : (
              <>
                <p className="text-lg font-semibold">{MESSAGES[outcome.result] ?? MESSAGES.error}</p>
                {camera === "running" && <button type="button" onClick={() => { setOutcome(null); try { scannerRef.current?.resume(); } catch {} }} className={btnPrimary}>Scan next</button>}
              </>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl bg-card p-6 shadow-sm">
        <h2 className="font-semibold text-foreground">Enter ticket code manually</h2>
        <form onSubmit={onManual} className="space-y-3">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="EVJ-7F8D5D2B93B84A71" aria-label="Ticket code" autoComplete="off" autoCapitalize="characters" className="w-full rounded-md border border-border px-3 py-3 font-mono text-foreground focus:border-ring focus:outline-none" />
          <button type="submit" disabled={busy || !online || !code.trim()} className={cn(btnPrimary, "h-auto w-full py-3")}>{busy ? "Checking..." : "Find attendee"}</button>
        </form>
      </section>
    </div>
  );
}
