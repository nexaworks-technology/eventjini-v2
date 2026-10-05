export type RegistrationStatus = "pending" | "approved" | "rejected" | "checked_in" | "cancelled";
export type FieldType = "text" | "long_text" | "dropdown" | "checkbox";

export type RegistrationField = {
  id: string;
  event_id: string;
  field_key: string;
  label: string;
  field_type: FieldType;
  required: boolean;
  options: string[] | null;
  sort_order: number;
};

export type RegistrationRow = {
  id: string;
  event_id: string;
  owner_user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  job_title: string | null;
  custom_answers: Record<string, string | boolean>;
  status: RegistrationStatus;
  ticket_code: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  sponsor_lead_consent: boolean;
  sponsor_lead_consented_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RegistrationValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  jobTitle: string;
  answers: Record<string, string | boolean>;
};

export const TICKET_CODE_RE = /^EVJ-[0-9A-F]{16}$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending: "Pending approval",
  approved: "Confirmed",
  rejected: "Rejected",
  checked_in: "Checked in",
  cancelled: "Cancelled",
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normalizeSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function validateRegistration(
  values: RegistrationValues,
  fields: RegistrationField[],
  requireB2b: boolean
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!normalizeSpaces(values.firstName)) errors.firstName = "First name is required.";
  if (!normalizeSpaces(values.lastName)) errors.lastName = "Last name is required.";
  if (!values.email.trim()) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(values.email.trim())) errors.email = "Enter a valid email address.";

  if (requireB2b) {
    if (!normalizeSpaces(values.companyName)) errors.companyName = "Company name is required.";
    if (!normalizeSpaces(values.jobTitle)) errors.jobTitle = "Job title is required.";
  }

  for (const f of fields) {
    const v = values.answers[f.field_key];
    const key = `answer:${f.field_key}`;
    if (f.field_type === "checkbox") {
      if (f.required && v !== true) errors[key] = `Please confirm "${f.label}".`;
    } else if (f.field_type === "dropdown") {
      const s = typeof v === "string" ? v.trim() : "";
      if (!s) {
        if (f.required) errors[key] = `Please answer "${f.label}".`;
      } else if (!f.options?.includes(s)) {
        errors[key] = `Choose one of the available options for "${f.label}".`;
      }
    } else {
      const s = typeof v === "string" ? v.trim() : "";
      if (!s && f.required) errors[key] = `Please answer "${f.label}".`;
    }
  }

  return errors;
}

export function fieldKeyFromLabel(label: string, taken: Set<string>): string {
  let base = label
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  if (!/^[a-z]/.test(base)) base = `q_${base}`.replace(/_+$/, "");
  if (base === "q") base = "question";
  let key = base;
  let n = 2;
  while (taken.has(key)) key = `${base}_${n++}`;
  return key;
}
