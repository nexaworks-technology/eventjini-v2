"use client";

import { btnPrimary, btnSecondarySm } from "@/components/eventjini/classes";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { OFFLINE_MESSAGE, useOnline } from "@/lib/use-online";
import {
  checkInTicket,
  searchGuestsForCheckIn,
  type CheckInOutcome,
  type GuestHit,
} from "@/app/dashboard/events/[id]/check-in/actions";

const READER_ID = "ej-qr-reader";

const MESSAGES: Record<string, string> = {
  not_found: "Ticket not found.",
  not_approved: "This registration is not approved for entry.",
  cancelled: "This registration was cancelled.",
  wrong_event: "This ticket belongs to a different event.",
  unauthorized: "You no longer have access to this event.",
  error: "Something went wrong. Please try again.",
};

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function CheckInScanner({ eventId }: { eventId: string }) {
  const [cameraState, setCameraState] = useState<"idle" | "starting" | "running" | "denied" | "unavailable">("idle");
  const [outcome, setOutcome] = useState<CheckInOutcome | null>(null);
  const [scanNote, setScanNote] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [hits, setHits] = useState<GuestHit[]>([]);
  const [query, setQuery] = useState("");
  const online = useOnline();
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const handlingRef = useRef(false);

  async function submit(raw: string, method: "qr" | "manual") {
    if (handlingRef.current) return;
    if (!navigator.onLine) {
      setScanNote(OFFLINE_MESSAGE);
      return;
    }
    handlingRef.current = true;
    setBusy(true);
    setScanNote(null);
    try {
      const result = await checkInTicket(eventId, raw, method);
      setOutcome(result);
      if (method === "manual") {
        setCode("");
        setHits([]);
        setQuery("");
      }
    } catch {
      setOutcome({ result: "error" });
    } finally {
      setBusy(false);
      handlingRef.current = false;
    }
  }

  async function startCamera() {
    setCameraState("starting");
    setOutcome(null);
    setScanNote(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(READER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => {
          if (handlingRef.current) return;
          if (!navigator.onLine) {
            setScanNote(OFFLINE_MESSAGE);
            return;
          }
          void submit(text, "qr");
          try {
            scanner.pause(true);
          } catch {}
        },
        () => {}
      );
      setCameraState("running");
    } catch (e) {
      const name = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      setCameraState(/denied|NotAllowed|Permission/i.test(name) ? "denied" : "unavailable");
      scannerRef.current = null;
    }
  }

  async function stopCamera() {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) {
      try {
        await s.stop();
        s.clear();
      } catch {}
    }
    setCameraState("idle");
  }

  function scanNext() {
    setOutcome(null);
    setScanNote(null);
    try {
      scannerRef.current?.resume();
    } catch {}
  }

  useEffect(() => {
    return () => {
      const s = scannerRef.current;
      if (s) {
        s.stop().then(() => s.clear()).catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await searchGuestsForCheckIn(eventId, query);
      if (!cancelled) setHits(r);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, eventId]);

  function onManual(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    void submit(code, "manual");
  }

  const ok = outcome && (outcome.result === "success" || outcome.result === "already_checked_in");

  return (
    <div className="space-y-6">
      {!online && (
        <p role="alert" className="rounded-md bg-warning/10 px-4 py-3 text-sm font-medium text-foreground">
          {OFFLINE_MESSAGE} Check-ins are not accepted or stored while offline.
        </p>
      )}
      <section className="space-y-4 rounded-xl bg-card p-6 shadow-sm">
        <div id={READER_ID} className="w-full overflow-hidden rounded-md" />

        {cameraState === "idle" && (
          <button
            type="button"
            onClick={startCamera}
            className={cn(btnPrimary, "h-auto w-full py-4 text-lg")}
          >
            Start camera
          </button>
        )}
        {cameraState === "starting" && <p className="text-center text-muted-foreground">Starting camera...</p>}
        {cameraState === "running" && (
          <div className="space-y-2 text-center">
            <p className="text-sm text-muted-foreground">Point camera at attendee QR code</p>
            <button type="button" onClick={stopCamera} className="text-sm text-muted-foreground underline">
              Stop camera
            </button>
          </div>
        )}
        {cameraState === "denied" && (
          <div role="alert" className="space-y-2 rounded-md bg-warning/10 px-4 py-3 text-sm text-foreground">
            <p className="font-medium">Camera access was denied.</p>
            <p>You can enter the ticket code manually.</p>
            <button type="button" onClick={startCamera} className="underline">
              Try camera again
            </button>
          </div>
        )}
        {cameraState === "unavailable" && (
          <div role="alert" className="space-y-2 rounded-md bg-warning/10 px-4 py-3 text-sm text-foreground">
            <p className="font-medium">The camera could not be started.</p>
            <p>You can enter the ticket code manually.</p>
            <button type="button" onClick={startCamera} className="underline">
              Try camera again
            </button>
          </div>
        )}

        {outcome && (
          <div
            role="status"
            className={`space-y-1 rounded-md px-4 py-5 text-center ${
              outcome.result === "success"
                ? "bg-success/10 text-success"
                : outcome.result === "already_checked_in"
                  ? "bg-warning/10 text-foreground"
                  : "bg-destructive/10 text-destructive"
            }`}
          >
            {ok && outcome && "firstName" in outcome ? (
              <>
                <p className="text-2xl font-semibold">
                  {outcome.result === "success" ? "✓ Checked in" : "Already checked in"}
                </p>
                <p className="text-xl font-medium">
                  {outcome.firstName} {outcome.lastName}
                </p>
                {outcome.companyName && <p>{outcome.companyName}</p>}
                <p className="text-sm">{outcome.eventTitle}</p>
                <p className="text-sm">
                  {outcome.result === "success" ? "" : "Checked in at "}
                  {timeOf(outcome.checkedInAt)}
                </p>
              </>
            ) : (
              <p className="text-lg font-semibold">{MESSAGES[outcome.result] ?? MESSAGES.error}</p>
            )}
            {cameraState === "running" && (
              <button
                type="button"
                onClick={scanNext}
                className={cn(btnPrimary, "mt-3")}
              >
                Scan next
              </button>
            )}
          </div>
        )}
        {scanNote && <p className="text-center text-sm text-muted-foreground">{scanNote}</p>}
      </section>

      <section className="space-y-3 rounded-xl bg-card p-6 shadow-sm">
        <h2 className="font-semibold text-foreground">Enter ticket code manually</h2>
        <form onSubmit={onManual} className="space-y-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="EVJ-7F8D5D2B93B84A71"
            aria-label="Ticket code"
            autoComplete="off"
            autoCapitalize="characters"
            className="w-full rounded-md border border-border px-3 py-3 font-mono text-foreground focus:border-ring focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !online || !code.trim()}
            className={cn(btnPrimary, "h-auto w-full py-3")}
          >
            {busy ? "Checking..." : "Check in"}
          </button>
        </form>

        <div className="space-y-2 border-t border-border pt-3">
          <label className="block text-sm font-medium text-foreground">Or find a guest by name</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, company or email"
            aria-label="Find a guest by name, company or email"
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ring focus:outline-none"
          />
          {query.trim().length >= 2 && hits.length > 0 && (
            <ul className="divide-y divide-border rounded-md border border-border">
              {hits.map((h) => (
                <li key={h.ticket_code} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span>
                    <span className="font-medium text-foreground">
                      {h.first_name} {h.last_name}
                    </span>
                    {h.company_name && <span className="text-muted-foreground"> · {h.company_name}</span>}
                    {h.status === "checked_in" && <span className="ml-2 text-xs text-foreground">checked in</span>}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => submit(h.ticket_code, "manual")}
                    className={btnSecondarySm}
                  >
                    Check in
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
