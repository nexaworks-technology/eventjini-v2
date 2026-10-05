"use client";

import { btnPrimary, btnSecondary, inputCls } from "@/components/eventjini/classes";
import { ImagePlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import {
  checkSlugAvailability,
  saveEvent,
  type SlugCheck,
} from "@/app/dashboard/events/actions";
import {
  STEP_FIELDS,
  validateEventValues,
  type EventFormValues,
  type FieldErrors,
} from "@/lib/events";
import { setCoverImage } from "@/app/dashboard/events/[id]/settings/actions";
import { SLUG_RE, slugify } from "@/lib/slug";
import { createClient } from "@/utils/supabase/client";
import { formatEventWhen, zonedToUtc } from "@/lib/time";

const STEPS = ["Basics", "Date & Time", "Settings", "Review"];
const COVER_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const COVER_MAX_BYTES = 5 * 1024 * 1024;

type Props = {
  mode: "create" | "edit";
  initialValues: EventFormValues;
  timezones: string[];
  eventId?: string;
  isPublished?: boolean;
};


function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </label>
  );
}

export function EventWizard({ mode, initialValues, timezones, eventId, isPublished }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<EventFormValues>(initialValues);
  const [tzChoice, setTzChoice] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [slugResult, setSlugResult] = useState<{ slug: string; state: SlugCheck["state"] } | null>(null);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const detectedTz = useSyncExternalStore(
    () => () => {},
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    () => ""
  );
  const defaultTz = mode === "create" ? detectedTz || "UTC" : initialValues.timezone;
  const values: EventFormValues = { ...form, timezone: tzChoice ?? defaultTz };
  const setValues = setForm;

  const zones = timezones.includes(values.timezone) ? timezones : [values.timezone, ...timezones];

  const slugValid = SLUG_RE.test(values.slug);
  const slugState: SlugCheck["state"] | "checking" | "idle" = !slugValid
    ? "idle"
    : slugResult?.slug === values.slug
      ? slugResult.state
      : "checking";

  useEffect(() => {
    if (!SLUG_RE.test(values.slug)) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await checkSlugAvailability(values.slug, eventId);
      if (!cancelled) setSlugResult({ slug: values.slug, state: result.state });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [values.slug, eventId]);

  const imageOk = failedImage !== values.coverImageUrl.trim();

  function update<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    if (key === "timezone") setTzChoice(value as string);
    else setForm((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function onTitleChange(title: string) {
    setValues((v) => ({ ...v, title, slug: slugTouched ? v.slug : slugify(title) }));
    setErrors((e) => ({ ...e, title: undefined, slug: undefined }));
  }

  function stepErrors(target: number): FieldErrors {
    const all = validateEventValues(values).errors;
    const mine: FieldErrors = {};
    for (const f of STEP_FIELDS[target]) if (all[f]) mine[f] = all[f];
    return mine;
  }

  async function next() {
    setFormError(null);
    const normalized = slugify(values.slug);
    if (step === 0 && normalized !== values.slug) setValues((v) => ({ ...v, slug: normalized }));

    const found = stepErrors(step);
    if (step === 0 && !found.slug && normalized) {
      const result = await checkSlugAvailability(normalized, eventId);
      if (result.state === "taken") found.slug = "That event URL is already in use. Choose another slug.";
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setStep(step + 1);
  }

  function submit(intent: "draft" | "publish" | "save") {
    setFormError(null);
    const { errors: all } = validateEventValues(values);
    if (Object.keys(all).length > 0) {
      setErrors(all);
      const first = STEP_FIELDS.findIndex((fields) => fields.some((f) => all[f]));
      if (first >= 0) setStep(first);
      setFormError("Please fix the highlighted fields.");
      return;
    }
    startTransition(async () => {
      const result = await saveEvent(values, intent, eventId, coverFile ? { noRedirect: true } : undefined);
      if (result.ok && coverFile) {
        // The event now exists, so the storage policy (event admins only) allows the upload.
        const id = result.eventId ?? eventId!;
        let uploaded = false;
        try {
          const path = `events/${id}/cover/${crypto.randomUUID()}.${COVER_TYPES[coverFile.type]}`;
          const { error } = await createClient().storage.from("event-assets").upload(path, coverFile, { contentType: coverFile.type, upsert: false });
          if (!error) uploaded = (await setCoverImage(id, path)).ok;
        } catch {
          uploaded = false;
        }
        if (!uploaded) toast.error("Your event was saved, but the cover image could not be uploaded. You can add it in Settings.");
        router.push(uploaded ? `/dashboard/events/${id}${intent === "publish" ? "?published=1" : ""}` : `/dashboard/events/${id}/settings`);
        return;
      }
      if (result && !result.ok) {
        setFormError(result.error ?? "Could not save the event. Please try again.");
        if (result.fieldErrors) {
          setErrors(result.fieldErrors);
          if (result.fieldErrors.slug) setStep(0);
        }
      }
    });
  }

  const startUtc = zonedToUtc(values.startDate, values.startTime, values.timezone);
  const endUtc = zonedToUtc(values.endDate, values.endTime, values.timezone);
  const when =
    startUtc && endUtc ? formatEventWhen(startUtc.toISOString(), endUtc.toISOString(), values.timezone) : null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <ol className="flex flex-wrap gap-2 text-sm">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`rounded-full px-3 py-1 ${
              i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                  ? "bg-muted text-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <div className="space-y-5 rounded-xl bg-card p-6 shadow-sm">
        {step === 0 && (
          <>
            <Field label="Event title" error={errors.title}>
              <input
                className={inputCls}
                value={values.title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="NexaWorks AI Summit 2027"
              />
            </Field>

            <Field label="Slug" error={errors.slug}>
              <input
                className={inputCls}
                value={values.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  update("slug", e.target.value.toLowerCase());
                }}
                onBlur={() => update("slug", slugify(values.slug))}
              />
              <span className="block text-xs text-muted-foreground">
                eventjini.com/e/{values.slug || "your-event"}
              </span>
              {slugState === "checking" && <span className="block text-xs text-muted-foreground">Checking availability...</span>}
              {slugState === "available" && (
                <span className="block text-xs text-success">✓ {values.slug} is available</span>
              )}
              {slugState === "taken" && (
                <span className="block text-xs text-destructive">✕ {values.slug} is already taken</span>
              )}
              {slugState === "error" && (
                <span className="block text-xs text-muted-foreground">
                  Could not check availability right now; it will be verified when you save.
                </span>
              )}
            </Field>

            <Field label="Description (optional)">
              <textarea
                className={inputCls}
                rows={4}
                value={values.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </Field>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Cover image (optional)</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                aria-label="Upload cover image"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  if (!COVER_TYPES[f.type]) return setCoverError("Unsupported file type. Use a JPEG, PNG or WebP image.");
                  if (f.size > COVER_MAX_BYTES) return setCoverError("That image is larger than 5 MB. Choose a smaller file.");
                  setCoverError(null);
                  if (coverPreview) URL.revokeObjectURL(coverPreview);
                  setCoverFile(f);
                  setCoverPreview(URL.createObjectURL(f));
                  update("coverImageUrl", "");
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={btnSecondary} onClick={() => fileRef.current?.click()}>
                  <ImagePlus aria-hidden /> {coverFile ? "Choose a different image" : "Upload an image"}
                </button>
                {coverFile && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      if (coverPreview) URL.revokeObjectURL(coverPreview);
                      setCoverFile(null);
                      setCoverPreview(null);
                    }}
                  >
                    <X className="size-3.5" aria-hidden /> Remove {coverFile.name}
                  </button>
                )}
                <span className="text-xs text-muted-foreground">JPEG, PNG or WebP, up to 5 MB.</span>
              </div>
              {coverError && <p role="alert" className="text-xs font-medium text-destructive">{coverError}</p>}
              {coverPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview} alt="Cover preview" className="h-40 w-full rounded-md object-cover" />
              )}
            </div>

            {!coverFile && (
            <Field label="Or paste an image URL" error={errors.coverImageUrl}>
              <input
                className={inputCls}
                value={values.coverImageUrl}
                onChange={(e) => update("coverImageUrl", e.target.value)}
                placeholder="https://..."
              />
            </Field>
            )}
            {!coverFile && values.coverImageUrl.trim() && !errors.coverImageUrl && /^https?:\/\//.test(values.coverImageUrl.trim()) && (
              imageOk ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={values.coverImageUrl.trim()}
                  alt="Cover preview"
                  onError={() => setFailedImage(values.coverImageUrl.trim())}
                  className="h-40 w-full rounded-md object-cover"
                />
              ) : (
                <p className="text-xs text-muted-foreground">The image could not be loaded from that URL.</p>
              )
            )}

            <Field label="Location (optional)">
              <input
                className={inputCls}
                value={values.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="Jio World Convention Centre, Mumbai"
              />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Start date" error={errors.startDate}>
                <input type="date" className={inputCls} value={values.startDate} onChange={(e) => update("startDate", e.target.value)} />
              </Field>
              <Field label="Start time" error={errors.startTime}>
                <input type="time" className={inputCls} value={values.startTime} onChange={(e) => update("startTime", e.target.value)} />
              </Field>
              <Field label="End date" error={errors.endDate}>
                <input type="date" className={inputCls} value={values.endDate} onChange={(e) => update("endDate", e.target.value)} />
              </Field>
              <Field label="End time" error={errors.endTime}>
                <input type="time" className={inputCls} value={values.endTime} onChange={(e) => update("endTime", e.target.value)} />
              </Field>
            </div>
            <Field label="Timezone" error={errors.timezone}>
              <select className={inputCls} value={values.timezone} onChange={(e) => update("timezone", e.target.value)}>
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </Field>
            {errors.range && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{errors.range}</p>}
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Capacity (optional)" error={errors.capacity}>
              <input
                inputMode="numeric"
                className={inputCls}
                value={values.capacity}
                onChange={(e) => update("capacity", e.target.value)}
                placeholder="500"
              />
            </Field>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={values.requiresApproval}
                onChange={(e) => update("requiresApproval", e.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">Require attendee approval</span>
                <span className="block text-xs text-muted-foreground">
                  Registrations will require organizer approval when registration is added in a later phase.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={values.requireB2bData}
                onChange={(e) => update("requireB2bData", e.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">Require business information</span>
                <span className="block text-xs text-muted-foreground">
                  Used by the registration flow to require business details such as company and work information.
                </span>
              </span>
            </label>
          </>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Review your event</h2>

            <Section title="Basics" onEdit={() => setStep(0)}>
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview} alt="" className="mb-2 h-32 w-full rounded-md object-cover" />
              ) : (
                values.coverImageUrl.trim() && imageOk && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={values.coverImageUrl.trim()} alt="" className="mb-2 h-32 w-full rounded-md object-cover" />
                )
              )}
              <p className="font-medium text-foreground">{values.title}</p>
              <p className="text-sm text-muted-foreground">/e/{values.slug}</p>
              {values.description && <p className="whitespace-pre-line text-sm text-foreground">{values.description}</p>}
              {values.location && <p className="text-sm text-foreground">{values.location}</p>}
            </Section>

            <Section title="Date & Time" onEdit={() => setStep(1)}>
              {when ? (
                <>
                  <p className="text-sm text-foreground">{when.date}</p>
                  <p className="text-sm text-foreground">{when.time}</p>
                </>
              ) : (
                <p className="text-sm text-destructive">Date and time are incomplete.</p>
              )}
              <p className="text-sm text-muted-foreground">{values.timezone}</p>
            </Section>

            <Section title="Settings" onEdit={() => setStep(2)}>
              <p className="text-sm text-foreground">Capacity: {values.capacity.trim() || "Not set"}</p>
              <p className="text-sm text-foreground">
                Registration approval: {values.requiresApproval ? "Required" : "Not required"}
              </p>
              <p className="text-sm text-foreground">
                Business information: {values.requireB2bData ? "Required" : "Not required"}
              </p>
            </Section>
          </div>
        )}

        {formError && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={pending}
              className={btnSecondary}
            >
              ← Back
            </button>
          ) : (
            <Link
              href={eventId ? `/dashboard/events/${eventId}` : "/dashboard/events"}
              className="text-sm text-muted-foreground underline"
            >
              Cancel
            </Link>
          )}
        </div>

        {step < 3 ? (
          <button
            type="button"
            onClick={next}
            className={btnPrimary}
          >
            Continue to {STEPS[step + 1]} →
          </button>
        ) : mode === "create" ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => submit("draft")}
              disabled={pending}
              className={btnSecondary}
            >
              {pending ? "Saving..." : "Save as draft"}
            </button>
            <button
              type="button"
              onClick={() => submit("publish")}
              disabled={pending}
              className={btnPrimary}
            >
              Publish event
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => submit("save")}
              disabled={pending}
              className={btnSecondary}
            >
              {pending ? "Saving..." : "Save changes"}
            </button>
            {!isPublished && (
              <button
                type="button"
                onClick={() => submit("publish")}
                disabled={pending}
                className={btnPrimary}
              >
                Save & publish
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1 rounded-md border border-border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        <button type="button" onClick={onEdit} className="text-xs font-medium text-foreground underline">
          Edit
        </button>
      </div>
      {children}
    </section>
  );
}
