"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
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
import { SLUG_RE, slugify } from "@/lib/slug";
import { formatEventWhen, zonedToUtc } from "@/lib/time";

const STEPS = ["Basics", "Date & Time", "Settings", "Review"];

type Props = {
  mode: "create" | "edit";
  initialValues: EventFormValues;
  timezones: string[];
  eventId?: string;
  isPublished?: boolean;
};

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-900 focus:outline-none";

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
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-zinc-500">{hint}</span>}
      {error && <span className="block text-xs text-red-600">{error}</span>}
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
      const result = await saveEvent(values, intent, eventId);
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
                ? "bg-zinc-900 text-white"
                : i < step
                  ? "bg-zinc-200 text-zinc-800"
                  : "bg-zinc-100 text-zinc-500"
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <div className="space-y-5 rounded-xl bg-white p-6 shadow-sm">
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
              <span className="block text-xs text-zinc-500">
                eventjini.com/e/{values.slug || "your-event"}
              </span>
              {slugState === "checking" && <span className="block text-xs text-zinc-500">Checking availability...</span>}
              {slugState === "available" && (
                <span className="block text-xs text-green-700">✓ {values.slug} is available</span>
              )}
              {slugState === "taken" && (
                <span className="block text-xs text-red-600">✕ {values.slug} is already taken</span>
              )}
              {slugState === "error" && (
                <span className="block text-xs text-zinc-500">
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

            <Field label="Cover image URL (optional)" error={errors.coverImageUrl}>
              <input
                className={inputCls}
                value={values.coverImageUrl}
                onChange={(e) => update("coverImageUrl", e.target.value)}
                placeholder="https://..."
              />
            </Field>
            {values.coverImageUrl.trim() && !errors.coverImageUrl && /^https?:\/\//.test(values.coverImageUrl.trim()) && (
              imageOk ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={values.coverImageUrl.trim()}
                  alt="Cover preview"
                  onError={() => setFailedImage(values.coverImageUrl.trim())}
                  className="h-40 w-full rounded-md object-cover"
                />
              ) : (
                <p className="text-xs text-zinc-500">The image could not be loaded from that URL.</p>
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
            {errors.range && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errors.range}</p>}
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
                <span className="block text-sm font-medium text-zinc-800">Require attendee approval</span>
                <span className="block text-xs text-zinc-500">
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
                <span className="block text-sm font-medium text-zinc-800">Require business information</span>
                <span className="block text-xs text-zinc-500">
                  Used by the registration flow to require business details such as company and work information.
                </span>
              </span>
            </label>
          </>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-zinc-900">Review your event</h2>

            <Section title="Basics" onEdit={() => setStep(0)}>
              {values.coverImageUrl.trim() && imageOk && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={values.coverImageUrl.trim()} alt="" className="mb-2 h-32 w-full rounded-md object-cover" />
              )}
              <p className="font-medium text-zinc-900">{values.title}</p>
              <p className="text-sm text-zinc-600">/e/{values.slug}</p>
              {values.description && <p className="whitespace-pre-line text-sm text-zinc-700">{values.description}</p>}
              {values.location && <p className="text-sm text-zinc-700">{values.location}</p>}
            </Section>

            <Section title="Date & Time" onEdit={() => setStep(1)}>
              {when ? (
                <>
                  <p className="text-sm text-zinc-800">{when.date}</p>
                  <p className="text-sm text-zinc-800">{when.time}</p>
                </>
              ) : (
                <p className="text-sm text-red-600">Date and time are incomplete.</p>
              )}
              <p className="text-sm text-zinc-600">{values.timezone}</p>
            </Section>

            <Section title="Settings" onEdit={() => setStep(2)}>
              <p className="text-sm text-zinc-800">Capacity: {values.capacity.trim() || "Not set"}</p>
              <p className="text-sm text-zinc-800">
                Registration approval: {values.requiresApproval ? "Required" : "Not required"}
              </p>
              <p className="text-sm text-zinc-800">
                Business information: {values.requireB2bData ? "Required" : "Not required"}
              </p>
            </Section>
          </div>
        )}

        {formError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
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
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              ← Back
            </button>
          ) : (
            <Link
              href={eventId ? `/dashboard/events/${eventId}` : "/dashboard/events"}
              className="text-sm text-zinc-600 underline"
            >
              Cancel
            </Link>
          )}
        </div>

        {step < 3 ? (
          <button
            type="button"
            onClick={next}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Continue to {STEPS[step + 1]} →
          </button>
        ) : mode === "create" ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => submit("draft")}
              disabled={pending}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
            >
              {pending ? "Saving..." : "Save as draft"}
            </button>
            <button
              type="button"
              onClick={() => submit("publish")}
              disabled={pending}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
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
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
            >
              {pending ? "Saving..." : "Save changes"}
            </button>
            {!isPublished && (
              <button
                type="button"
                onClick={() => submit("publish")}
                disabled={pending}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
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
    <section className="space-y-1 rounded-md border border-zinc-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
        <button type="button" onClick={onEdit} className="text-xs font-medium text-zinc-900 underline">
          Edit
        </button>
      </div>
      {children}
    </section>
  );
}
