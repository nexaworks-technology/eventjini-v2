"use client";

import { CalendarPlus, CheckCircle2, Clock, Ticket } from "lucide-react";
import Link from "next/link";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { submitRegistration, type SubmitResult } from "@/app/e/[slug]/register/actions";
import { btnSecondary, inputCls } from "@/components/eventjini/classes";
import { FieldError, FormMessage } from "@/components/eventjini/form-feedback";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  validateRegistration,
  type RegistrationField,
  type RegistrationValues,
} from "@/lib/registration";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

const ctaCls = "event-cta inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-[filter]";

/** Label + control + the shared inline error. The control receives id / aria-invalid / aria-describedby. */
function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: (a: { id: string; "aria-invalid"?: true; "aria-describedby"?: string }) => ReactNode }) {
  const id = useId();
  const errId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive" aria-hidden> *</span>}
      </Label>
      {children({ id, ...(error ? { "aria-invalid": true as const, "aria-describedby": errId } : {}) })}
      <FieldError id={errId}>{error}</FieldError>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-xl border bg-card p-5 text-card-foreground">
      <legend className="px-1 font-heading text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

export function RegistrationForm({
  eventId,
  eventTitle,
  requireB2b,
  fields,
}: {
  eventId: string;
  eventTitle: string;
  requireB2b: boolean;
  fields: RegistrationField[];
}) {
  const [values, setValues] = useState<RegistrationValues>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyName: "",
    jobTitle: "",
    answers: Object.fromEntries(fields.filter((f) => f.field_type === "checkbox").map((f) => [f.field_key, false])),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<Extract<SubmitResult, { ok: true }> | null>(null);

  function set<K extends keyof RegistrationValues>(key: K, value: RegistrationValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }
  function setAnswer(key: string, value: string | boolean) {
    setValues((v) => ({ ...v, answers: { ...v.answers, [key]: value } }));
    setErrors((e) => ({ ...e, [`answer:${key}`]: "" }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setFormError(null);
    setAlreadyRegistered(false);

    const found = validateRegistration(values, fields, requireB2b);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setPending(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          setFormError("Guest registration is not available right now. Please try again later.");
          return;
        }
      }

      const result = await submitRegistration(eventId, values);
      if (result.ok) {
        setDone(result);
        return;
      }
      if (result.fieldErrors) setErrors(result.fieldErrors);
      if (result.code === "ALREADY_REGISTERED") setAlreadyRegistered(true);
      setFormError(result.error);
    } catch {
      setFormError("We couldn't complete your registration. Your registration was not created. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    const open = done.status === "approved";
    return (
      <div className="space-y-4 rounded-xl border bg-card p-6 text-center text-card-foreground" role="status">
        <span className={cn("mx-auto flex size-12 items-center justify-center rounded-full", open ? "bg-success/12 text-success" : "bg-warning/15 text-foreground")}>
          {open ? <CheckCircle2 className="size-6" aria-hidden /> : <Clock className="size-6" aria-hidden />}
        </span>
        <h2 className="font-heading text-xl font-semibold">{open ? "Registration confirmed" : "Application received"}</h2>
        <p className="text-sm text-muted-foreground">
          {open ? "Your ticket is ready." : "The organizer needs to approve your registration. We'll show your status in My Tickets."}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {open && done.ticketCode && (
            <>
              <Link href={`/tickets/${done.ticketCode}`} className={ctaCls}><Ticket className="size-4" aria-hidden /> View ticket</Link>
              <a href={`/api/events/${eventId}/calendar`} className={cn(btnSecondary, "h-11")}><CalendarPlus aria-hidden /> Add to calendar</a>
            </>
          )}
          {!open && <Link href="/my-tickets" className={ctaCls}>My Tickets</Link>}
        </div>
      </div>
    );
  }

  const control = cn(inputCls, "h-10");

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5" aria-label={`Register for ${eventTitle}`}>
      <Group title="Your information">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required error={errors.firstName}>
            {(a) => <input {...a} className={control} autoComplete="given-name" value={values.firstName} disabled={pending} onChange={(e) => set("firstName", e.target.value)} />}
          </Field>
          <Field label="Last name" required error={errors.lastName}>
            {(a) => <input {...a} className={control} autoComplete="family-name" value={values.lastName} disabled={pending} onChange={(e) => set("lastName", e.target.value)} />}
          </Field>
        </div>
        <Field label="Email" required error={errors.email}>
          {(a) => <input {...a} type="email" className={control} autoComplete="email" value={values.email} disabled={pending} onChange={(e) => set("email", e.target.value)} />}
        </Field>
        <Field label="Phone" error={errors.phone}>
          {(a) => <input {...a} type="tel" className={control} autoComplete="tel" value={values.phone} disabled={pending} onChange={(e) => set("phone", e.target.value)} />}
        </Field>
      </Group>

      {requireB2b && (
        <Group title="Business information">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name" required error={errors.companyName}>
              {(a) => <input {...a} className={control} autoComplete="organization" value={values.companyName} disabled={pending} onChange={(e) => set("companyName", e.target.value)} />}
            </Field>
            <Field label="Job title" required error={errors.jobTitle}>
              {(a) => <input {...a} className={control} autoComplete="organization-title" value={values.jobTitle} disabled={pending} onChange={(e) => set("jobTitle", e.target.value)} />}
            </Field>
          </div>
        </Group>
      )}

      {fields.length > 0 && (
        <Group title="Additional questions">
          {fields.map((f) => {
            const key = `answer:${f.field_key}`;
            const v = values.answers[f.field_key];
            if (f.field_type === "checkbox") {
              const errId = `cb-${f.id}-error`;
              return (
                <div key={f.id} className="space-y-1.5">
                  <label className="flex items-start gap-3 text-sm">
                    <input type="checkbox" className="mt-0.5 size-4" checked={v === true} disabled={pending} aria-invalid={errors[key] ? true : undefined} aria-describedby={errors[key] ? errId : undefined} onChange={(e) => setAnswer(f.field_key, e.target.checked)} />
                    <span>{f.label}{f.required && <span className="text-destructive" aria-hidden> *</span>}</span>
                  </label>
                  <FieldError id={errId}>{errors[key]}</FieldError>
                </div>
              );
            }
            return (
              <Field key={f.id} label={f.label} required={f.required} error={errors[key]}>
                {(a) =>
                  f.field_type === "long_text" ? (
                    <textarea {...a} className={inputCls} rows={4} value={typeof v === "string" ? v : ""} disabled={pending} onChange={(e) => setAnswer(f.field_key, e.target.value)} />
                  ) : f.field_type === "dropdown" ? (
                    <NativeSelect {...a} className="w-full [&_select]:h-10" value={typeof v === "string" ? v : ""} disabled={pending} onChange={(e) => setAnswer(f.field_key, e.target.value)}>
                      <NativeSelectOption value="">Select...</NativeSelectOption>
                      {f.options?.map((o) => <NativeSelectOption key={o} value={o}>{o}</NativeSelectOption>)}
                    </NativeSelect>
                  ) : (
                    <input {...a} className={control} value={typeof v === "string" ? v : ""} disabled={pending} onChange={(e) => setAnswer(f.field_key, e.target.value)} />
                  )
                }
              </Field>
            );
          })}
        </Group>
      )}

      {formError && (
        <FormMessage>
          <p>{formError}</p>
          {alreadyRegistered && <Link href="/my-tickets" className="font-medium underline">View My Tickets</Link>}
        </FormMessage>
      )}

      <button type="submit" disabled={pending} className={cn(ctaCls, "w-full")}>
        {pending ? "Submitting..." : "Submit registration"}
      </button>
      <p className="text-center text-xs text-muted-foreground">No account needed. <span className="text-destructive">*</span> Required</p>
    </form>
  );
}
