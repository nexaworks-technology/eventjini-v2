"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { submitRegistration, type SubmitResult } from "@/app/e/[slug]/register/actions";
import {
  validateRegistration,
  type RegistrationField,
  type RegistrationValues,
} from "@/lib/registration";
import { createClient } from "@/utils/supabase/client";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-900 focus:outline-none disabled:opacity-60";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
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
      <div className="space-y-4 text-center">
        <h2 className="text-xl font-semibold text-zinc-900">
          {open ? "Registration confirmed ✓" : "Application received ✓"}
        </h2>
        <p className="text-sm text-zinc-600">
          {open
            ? "Your ticket is ready."
            : "The organizer needs to approve your registration. We'll show your status in My Tickets."}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {open && done.ticketCode && (
            <>
              <Link
                href={`/tickets/${done.ticketCode}`}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                View ticket
              </Link>
              <a
                href={`/api/events/${eventId}/calendar`}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Add to calendar
              </a>
            </>
          )}
          {!open && (
            <Link
              href="/my-tickets"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              My Tickets
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <p className="text-sm text-zinc-500">Registering for {eventTitle}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name *" error={errors.firstName}>
          <input className={inputCls} autoComplete="given-name" value={values.firstName} disabled={pending} onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label="Last name *" error={errors.lastName}>
          <input className={inputCls} autoComplete="family-name" value={values.lastName} disabled={pending} onChange={(e) => set("lastName", e.target.value)} />
        </Field>
      </div>
      <Field label="Email *" error={errors.email}>
        <input type="email" className={inputCls} autoComplete="email" value={values.email} disabled={pending} onChange={(e) => set("email", e.target.value)} />
      </Field>
      <Field label="Phone" error={errors.phone}>
        <input type="tel" className={inputCls} autoComplete="tel" value={values.phone} disabled={pending} onChange={(e) => set("phone", e.target.value)} />
      </Field>

      {requireB2b && (
        <>
          <Field label="Company name *" error={errors.companyName}>
            <input className={inputCls} autoComplete="organization" value={values.companyName} disabled={pending} onChange={(e) => set("companyName", e.target.value)} />
          </Field>
          <Field label="Job title *" error={errors.jobTitle}>
            <input className={inputCls} autoComplete="organization-title" value={values.jobTitle} disabled={pending} onChange={(e) => set("jobTitle", e.target.value)} />
          </Field>
        </>
      )}

      {fields.map((f) => {
        const key = `answer:${f.field_key}`;
        const label = `${f.label}${f.required ? " *" : ""}`;
        const v = values.answers[f.field_key];
        if (f.field_type === "checkbox") {
          return (
            <div key={f.id} className="space-y-1">
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" checked={v === true} disabled={pending} onChange={(e) => setAnswer(f.field_key, e.target.checked)} />
                <span className="text-sm text-zinc-800">{label}</span>
              </label>
              {errors[key] && <span className="block text-xs text-red-600">{errors[key]}</span>}
            </div>
          );
        }
        return (
          <Field key={f.id} label={label} error={errors[key]}>
            {f.field_type === "long_text" ? (
              <textarea className={inputCls} rows={4} value={typeof v === "string" ? v : ""} disabled={pending} onChange={(e) => setAnswer(f.field_key, e.target.value)} />
            ) : f.field_type === "dropdown" ? (
              <select className={inputCls} value={typeof v === "string" ? v : ""} disabled={pending} onChange={(e) => setAnswer(f.field_key, e.target.value)}>
                <option value="">Select...</option>
                {f.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input className={inputCls} value={typeof v === "string" ? v : ""} disabled={pending} onChange={(e) => setAnswer(f.field_key, e.target.value)} />
            )}
          </Field>
        );
      })}

      {formError && (
        <div role="alert" className="space-y-1 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{formError}</p>
          {alreadyRegistered && (
            <Link href="/my-tickets" className="font-medium underline">
              View My Tickets
            </Link>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Submitting..." : "Submit registration"}
      </button>
    </form>
  );
}
