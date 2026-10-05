"use client";

import { useConfirm } from "@/components/eventjini/confirm-dialog";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { checkSlugAvailability, saveEvent } from "@/app/dashboard/events/actions";
import { removeCoverImage, saveBranding, setCoverImage, unpublishEvent } from "@/app/dashboard/events/[id]/settings/actions";
import { btnDanger, btnPrimary, btnSecondary, inputCls } from "@/components/eventjini/classes";
import { contrastOnWhite, DEFAULT_ACCENT, DEFAULT_PRIMARY, HEX_RE, readableOn } from "@/lib/branding";
import { validateEventValues, type EventFormValues, type FieldErrors } from "@/lib/events";
import { CURRENCIES } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { createClient } from "@/utils/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl bg-card p-6 shadow-sm">
      <h2 className="font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
function Msg({ m }: { m: { ok: boolean; text: string } | null }) {
  return m ? <p role="alert" className={`rounded-md px-3 py-2 text-sm ${m.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{m.text}</p> : null;
}

export function SettingsForm({
  eventId, initial, timezones, coverUrl, primary, accent, currency, title, status,
}: {
  eventId: string; initial: EventFormValues; timezones: string[]; coverUrl: string | null;
  primary: string | null; accent: string | null; currency: string; title: string; status: string;
}) {
  const confirm = useConfirm();
  const router = useRouter();
  const [v, setV] = useState<EventFormValues>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [detailsMsg, setDetailsMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [slugHint, setSlugHint] = useState<string | null>(null);
  const [pDetails, startDetails] = useTransition();

  const [pc, setPc] = useState(primary ?? DEFAULT_PRIMARY);
  const [ac, setAc] = useState(accent ?? DEFAULT_ACCENT);
  const [cur, setCur] = useState(currency);
  const [brandMsg, setBrandMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pBrand, startBrand] = useTransition();

  const [cover, setCover] = useState(coverUrl);
  const [coverMsg, setCoverMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [dangerMsg, setDangerMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pDanger, startDanger] = useTransition();

  const P = HEX_RE.test(pc) ? pc : DEFAULT_PRIMARY;
  const A = HEX_RE.test(ac) ? ac : DEFAULT_ACCENT;
  const zones = timezones.includes(v.timezone) ? timezones : [v.timezone, ...timezones];
  const set = <K extends keyof EventFormValues>(k: K, val: EventFormValues[K]) => { setV((x) => ({ ...x, [k]: val })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const err = (k: keyof FieldErrors) => (errors[k] ? <span className="block text-xs text-destructive">{errors[k]}</span> : null);

  function saveDetails() {
    setDetailsMsg(null);
    const { errors: found } = validateEventValues(v);
    setErrors(found);
    if (Object.keys(found).length) { setDetailsMsg({ ok: false, text: "Please fix the highlighted fields." }); return; }
    startDetails(async () => {
      const r = await saveEvent(v, "settings", eventId);
      if (r.ok) { setDetailsMsg({ ok: true, text: "Changes saved." }); router.refresh(); return; }
      if (r.fieldErrors) setErrors(r.fieldErrors);
      setDetailsMsg({ ok: false, text: r.error ?? "Could not save changes." });
    });
  }

  function saveBrand() {
    setBrandMsg(null);
    if (!HEX_RE.test(pc) || !HEX_RE.test(ac)) { setBrandMsg({ ok: false, text: "Colors must be hex values like #C2410C." }); return; }
    startBrand(async () => {
      const r = await saveBranding(eventId, pc, ac, cur);
      setBrandMsg(r.ok ? { ok: true, text: "Branding saved." } : { ok: false, text: r.error });
      router.refresh();
    });
  }

  async function upload(file: File) {
    setCoverMsg(null);
    const ext = TYPES[file.type];
    if (!ext) { setCoverMsg({ ok: false, text: "Unsupported file type. Use a JPEG, PNG or WebP image." }); return; }
    if (file.size > MAX_BYTES) { setCoverMsg({ ok: false, text: "That image is larger than 5 MB. Choose a smaller file." }); return; }
    setUploading(true);
    try {
      const path = `events/${eventId}/cover/${crypto.randomUUID()}.${ext}`;
      const { error } = await createClient().storage.from("event-assets").upload(path, file, { contentType: file.type, upsert: false });
      if (error) { setCoverMsg({ ok: false, text: "Upload failed. You may not have permission, or the file was rejected." }); return; }
      const r = await setCoverImage(eventId, path);
      if (!r.ok) { setCoverMsg({ ok: false, text: r.error }); return; }
      setCover(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-assets/${path}`);
      setCoverMsg({ ok: true, text: "Cover updated." });
      router.refresh();
    } catch {
      setCoverMsg({ ok: false, text: "Upload failed. Please try again." });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <Section title="Event details">
        <label className="block space-y-1 text-sm font-medium text-foreground">Title *<input className={inputCls} value={v.title} onChange={(e) => set("title", e.target.value)} />{err("title")}</label>
        <label className="block space-y-1 text-sm font-medium text-foreground">Slug *
          <input className={inputCls} value={v.slug} onChange={(e) => { set("slug", e.target.value.toLowerCase()); setSlugHint(null); }} onBlur={async () => {
            const n = slugify(v.slug); set("slug", n);
            if (n && n !== initial.slug) { const r = await checkSlugAvailability(n, eventId); setSlugHint(r.state === "taken" ? "✕ That slug is already taken" : r.state === "available" ? "✓ Available" : null); } else setSlugHint(null);
          }} />
          {slugHint && <span className="block text-xs text-muted-foreground">{slugHint}</span>}{err("slug")}
        </label>
        <label className="block space-y-1 text-sm font-medium text-foreground">Description<textarea className={inputCls} rows={4} value={v.description} onChange={(e) => set("description", e.target.value)} /></label>

        <h3 className="pt-2 text-sm font-semibold text-foreground">Date &amp; location</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm font-medium text-foreground">Start date<input type="date" className={inputCls} value={v.startDate} onChange={(e) => set("startDate", e.target.value)} />{err("startDate")}</label>
          <label className="block space-y-1 text-sm font-medium text-foreground">Start time<input type="time" className={inputCls} value={v.startTime} onChange={(e) => set("startTime", e.target.value)} />{err("startTime")}</label>
          <label className="block space-y-1 text-sm font-medium text-foreground">End date<input type="date" className={inputCls} value={v.endDate} onChange={(e) => set("endDate", e.target.value)} />{err("endDate")}</label>
          <label className="block space-y-1 text-sm font-medium text-foreground">End time<input type="time" className={inputCls} value={v.endTime} onChange={(e) => set("endTime", e.target.value)} />{err("endTime")}</label>
        </div>
        {errors.range && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{errors.range}</p>}
        <label className="block space-y-1 text-sm font-medium text-foreground">Timezone
          <select className={inputCls} value={v.timezone} onChange={(e) => set("timezone", e.target.value)}>{zones.map((z) => <option key={z} value={z}>{z}</option>)}</select>{err("timezone")}
        </label>
        <label className="block space-y-1 text-sm font-medium text-foreground">Location<input className={inputCls} value={v.location} onChange={(e) => set("location", e.target.value)} /></label>

        <h3 className="pt-2 text-sm font-semibold text-foreground">Registration settings</h3>
        <label className="block space-y-1 text-sm font-medium text-foreground">Capacity<input className={inputCls} inputMode="numeric" value={v.capacity} onChange={(e) => set("capacity", e.target.value)} />{err("capacity")}</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.requiresApproval} onChange={(e) => set("requiresApproval", e.target.checked)} />Require attendee approval</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.requireB2bData} onChange={(e) => set("requireB2bData", e.target.checked)} />Require business information</label>

        <Msg m={detailsMsg} />
        <button type="button" className={btnPrimary} disabled={pDetails} onClick={saveDetails}>{pDetails ? "Saving..." : "Save changes"}</button>
      </Section>

      <Section title="Event cover">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-40 w-full rounded-md object-cover" />
        ) : (
          <p className="rounded-md bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">No cover image yet. The event page works without one.</p>
        )}
        <input ref={fileRef} id="cover-file" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Choose cover image" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={btnSecondary} disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? "Uploading..." : cover ? "Replace cover" : "Upload cover"}</button>
          {cover && <button type="button" className={btnDanger} disabled={uploading} onClick={async () => { if (!await confirm({ title: "Remove the cover image?", destructive: true })) return; setUploading(true); const r = await removeCoverImage(eventId); setUploading(false); if (r.ok) { setCover(null); setCoverMsg({ ok: true, text: "Cover removed." }); router.refresh(); } else setCoverMsg({ ok: false, text: r.error }); }}>Remove</button>}
          <span className="text-xs text-muted-foreground">JPEG, PNG or WebP, up to 5 MB.</span>
        </div>
        <Msg m={coverMsg} />
      </Section>

      <Section title="Branding">
        <div className="grid gap-4 sm:grid-cols-2">
          {([["Primary color", pc, setPc], ["Accent color", ac, setAc]] as const).map(([label, val, setter]) => (
            <label key={label} className="block space-y-1 text-sm font-medium text-foreground">{label}
              <span className="flex items-center gap-2">
                <input type="color" aria-label={`${label} picker`} className="h-10 w-12 rounded border border-border" value={HEX_RE.test(val) ? val : "#000000"} onChange={(e) => setter(e.target.value.toUpperCase())} />
                <input className={inputCls} value={val} onChange={(e) => setter(e.target.value)} />
              </span>
            </label>
          ))}
        </div>
        <label className="block space-y-1 text-sm font-medium text-foreground">Currency (budget and vendors)
          <select className={inputCls} value={cur} onChange={(e) => setCur(e.target.value)}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        </label>
        <div className="space-y-2 rounded-md border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground">Preview (public event page)</p>
          <div className="overflow-hidden rounded-lg border">
            <div className="space-y-3 px-4 py-5" style={{ backgroundColor: P, color: readableOn(P) }}>
              <p className="font-heading text-xl font-semibold">{title}</p>
              <span className="inline-block rounded-lg px-4 py-2 text-sm font-semibold" style={{ backgroundColor: readableOn(P), color: P }}>Register</span>
            </div>
            <div className="bg-card px-4 py-4">
              <span className="inline-block rounded-lg px-4 py-2 text-sm font-semibold" style={{ backgroundColor: A, color: readableOn(A) }}>Register</span>
            </div>
          </div>
        </div>
        {HEX_RE.test(ac) && contrastOnWhite(ac) < 1.5 && (
          <p role="status" className="rounded-md bg-warning/10 px-3 py-2 text-sm text-foreground">
            This accent color is very close to white, so the lower Register button may blend into light page backgrounds.
          </p>
        )}
        <Msg m={brandMsg} />
        <button type="button" className={btnPrimary} disabled={pBrand} onClick={saveBrand}>{pBrand ? "Saving..." : "Save branding"}</button>
      </Section>

      <Section title="Danger zone">
        <p className="text-sm text-muted-foreground">Unpublishing hides the public event page, registration and sponsor pages until you publish again. Existing registrations are kept.</p>
        <Msg m={dangerMsg} />
        <button type="button" className={btnDanger} disabled={pDanger || status !== "published"} onClick={async () => { if (await confirm({ title: "Unpublish this event? The public page will return 404.", destructive: true })) startDanger(async () => { const r = await unpublishEvent(eventId); setDangerMsg(r.ok ? { ok: true, text: "Event unpublished." } : { ok: false, text: r.error }); router.refresh(); }); }}>
          {pDanger ? "Unpublishing..." : status === "published" ? "Unpublish event" : "Event is not published"}
        </button>
      </Section>
    </div>
  );
}
