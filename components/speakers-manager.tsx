"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteSpeaker, saveSpeaker } from "@/app/dashboard/events/[id]/speakers/actions";
import { btnPrimary, btnSecondary, btnSecondarySm, inputCls } from "@/components/eventjini/classes";
import { useConfirm } from "@/components/eventjini/confirm-dialog";
import {
  emptySpeakerInput,
  initials,
  SPEAKER_LIMITS,
  SPEAKER_SOCIAL_KEYS,
  SPEAKER_SOCIAL_LABELS,
  speakerTitleLine,
  speakerToInput,
  type SpeakerInput,
  type SpeakerRow,
} from "@/lib/speakers";
import { createClient } from "@/utils/supabase/client";

const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

export function SpeakerAvatar({ name, photoUrl, size = "md" }: { name: string; photoUrl: string | null; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "size-10 text-sm" : "size-16 text-lg";
  return photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photoUrl} alt="" className={`${cls} shrink-0 rounded-full object-cover`} />
  ) : (
    <span aria-hidden className={`${cls} inline-flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary`}>
      {initials(name)}
    </span>
  );
}

export function SpeakersManager({
  eventId,
  speakers,
  sessionCounts,
  canEdit,
}: {
  eventId: string;
  speakers: SpeakerRow[];
  sessionCounts: Record<string, number>;
  canEdit: boolean;
}) {
  const confirm = useConfirm();
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<SpeakerInput>(emptySpeakerInput());
  /** undefined = unchanged, null = remove, File = replace */
  const [photo, setPhoto] = useState<File | null | undefined>(undefined);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const current = editing && editing !== "new" ? speakers.find((s) => s.id === editing) : undefined;
  const shownPhoto = photo instanceof File ? preview : photo === null ? null : current?.photo_url ?? null;

  function open(id: string | "new") {
    const s = id === "new" ? undefined : speakers.find((x) => x.id === id);
    setEditing(id);
    setForm(s ? speakerToInput(s) : emptySpeakerInput());
    setPhoto(undefined);
    setPreview(null);
    setError(null);
  }
  function close() {
    setEditing(null);
    setPhoto(undefined);
    setPreview(null);
  }
  const set = <K extends keyof SpeakerInput>(k: K, val: SpeakerInput[K]) => setForm((f) => ({ ...f, [k]: val }));

  function pickPhoto(f: File | undefined) {
    if (!f) return;
    if (!PHOTO_TYPES[f.type]) return setError("Use a JPEG, PNG or WebP image.");
    if (f.size > PHOTO_MAX_BYTES) return setError("That photo is larger than 2 MB. Choose a smaller file.");
    setError(null);
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  }

  function save() {
    setError(null);
    if (!form.name.trim()) return setError("Speaker name is required.");
    startTransition(async () => {
      let photoArg: string | null | undefined = photo === null ? null : undefined;
      if (photo instanceof File) {
        const path = `events/${eventId}/speakers/${crypto.randomUUID()}.${PHOTO_TYPES[photo.type]}`;
        const { error: upErr } = await createClient().storage.from("event-assets").upload(path, photo, { contentType: photo.type, upsert: false });
        if (upErr) return setError("The photo could not be uploaded. Please try again.");
        photoArg = path;
      }
      const r = await saveSpeaker(eventId, editing === "new" ? null : editing, form, photoArg);
      if (!r.ok) return setError(r.error);
      close();
      router.refresh();
    });
  }

  async function remove(s: SpeakerRow) {
    const n = sessionCounts[s.id] ?? 0;
    const ok = await confirm({
      title: `Delete ${s.name}?`,
      description: n ? `They will be removed from ${n} ${n === 1 ? "session" : "sessions"} in the agenda.` : undefined,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const r = await deleteSpeaker(eventId, s.id);
      if (!r.ok) setError(r.error);
      if (editing === s.id) close();
      router.refresh();
    });
  }

  const formUi = (
    <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <SpeakerAvatar name={form.name || "?"} photoUrl={shownPhoto} />
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Speaker photo" onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={btnSecondarySm} onClick={() => fileRef.current?.click()}>{shownPhoto ? "Change photo" : "Add photo"}</button>
          {shownPhoto && <button type="button" className="text-sm text-muted-foreground underline" onClick={() => { setPhoto(null); setPreview(null); }}>Remove photo</button>}
          <span className="text-xs text-muted-foreground">Square works best. JPEG, PNG or WebP, up to 2 MB.</span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm font-medium sm:col-span-2">Name *
          <input className={inputCls} maxLength={SPEAKER_LIMITS.name} value={form.name} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm font-medium">Designation
          <input className={inputCls} maxLength={SPEAKER_LIMITS.designation} value={form.designation} onChange={(e) => set("designation", e.target.value)} placeholder="Head of AI" />
        </label>
        <label className="block space-y-1 text-sm font-medium">Organization
          <input className={inputCls} maxLength={SPEAKER_LIMITS.organization} value={form.organization} onChange={(e) => set("organization", e.target.value)} placeholder="Acme Labs" />
        </label>
        <label className="block space-y-1 text-sm font-medium sm:col-span-2">Bio
          <textarea className={inputCls} rows={4} maxLength={SPEAKER_LIMITS.bio} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
          <span className="block text-xs font-normal text-muted-foreground">{form.bio.length}/{SPEAKER_LIMITS.bio}</span>
        </label>
        {SPEAKER_SOCIAL_KEYS.map((k) => (
          <label key={k} className="block space-y-1 text-sm font-medium">{SPEAKER_SOCIAL_LABELS[k]}
            <input className={inputCls} type="url" inputMode="url" placeholder="https://" value={form.socialLinks[k]} onChange={(e) => set("socialLinks", { ...form.socialLinks, [k]: e.target.value })} />
          </label>
        ))}
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} />
        <span><span className="font-medium">Featured speaker</span><span className="block text-xs text-muted-foreground">Shown first on the event page.</span></span>
      </label>
      {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={pending} className={btnPrimary}>{pending ? "Saving..." : "Save speaker"}</button>
        <button type="button" onClick={close} disabled={pending} className={btnSecondary}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {error && !editing && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {canEdit && editing === "new" ? formUi : canEdit && (
        <button type="button" onClick={() => open("new")} className={btnSecondarySm}>+ Add speaker</button>
      )}

      {speakers.length === 0 && editing !== "new" && (
        <div className="rounded-xl bg-card p-8 text-center text-muted-foreground shadow-sm">
          No speakers yet.{canEdit && " Add speakers here, then assign them to sessions in the agenda."}
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {speakers.map((s) =>
          editing === s.id ? (
            <li key={s.id} className="sm:col-span-2">{formUi}</li>
          ) : (
            <li key={s.id} className="flex gap-4 rounded-xl border bg-card p-4">
              <SpeakerAvatar name={s.name} photoUrl={s.photo_url} />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="flex items-center gap-1.5 font-medium">
                  <span className="truncate">{s.name}</span>
                  {s.is_featured && <Star className="size-3.5 shrink-0 fill-primary text-primary" aria-label="Featured" />}
                </p>
                {speakerTitleLine(s) && <p className="truncate text-sm text-muted-foreground">{speakerTitleLine(s)}</p>}
                <p className="text-xs text-muted-foreground">
                  {sessionCounts[s.id] ? `${sessionCounts[s.id]} ${sessionCounts[s.id] === 1 ? "session" : "sessions"}` : "Not in any session yet"}
                </p>
                {canEdit && (
                  <div className="flex gap-3 pt-1 text-sm">
                    <button type="button" onClick={() => open(s.id)} className="underline">Edit</button>
                    <button type="button" onClick={() => remove(s)} disabled={pending} className="text-destructive underline">Delete</button>
                  </div>
                )}
              </div>
            </li>
          )
        )}
      </ul>
    </div>
  );
}
