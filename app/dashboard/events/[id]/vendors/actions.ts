"use server";

import { ADMIN_ROLES, authorizeAction } from "@/lib/event-access";
import { emailFormatError } from "@/lib/email-address";
import { emailDomainExists } from "@/lib/email-domain";
import { parseAmount } from "@/lib/money";
import { phoneError } from "@/lib/phone";
import { UUID_RE } from "@/lib/registration";

export type VendorStatus = "prospect" | "confirmed" | "completed" | "cancelled";
export type VendorInput = { name: string; category: string; city: string; contactName: string; contactEmail: string; contactPhone: string; cost: string; status: VendorStatus; notes: string };
export type VendorResult = { ok: true } | { ok: false; error: string; field?: string };

const STATUSES: VendorStatus[] = ["prospect", "confirmed", "completed", "cancelled"];

type Validated =
  | { error: string; field: string }
  | { row: { name: string; category: string; city: string; contact_name: string | null; contact_email: string; contact_phone: string; cost: number; status: VendorStatus; notes: string | null } };

function validate(i: VendorInput): Validated {
  const name = i.name.trim();
  const category = i.category.trim();
  if (!name) return { error: "Vendor name is required.", field: "name" };
  if (name.length > 200) return { error: "Vendor name must be 200 characters or fewer.", field: "name" };
  if (!category) return { error: "Category is required.", field: "category" };
  if (category.length > 80) return { error: "Category must be 80 characters or fewer.", field: "category" };
  const city = i.city.trim();
  if (!city) return { error: "City is required.", field: "city" };
  if (city.length > 80) return { error: "City must be 80 characters or fewer.", field: "city" };
  const email = i.contactEmail.trim();
  const emailErr = emailFormatError(email);
  if (emailErr) return { error: emailErr === "Email is required." ? "Contact email is required." : emailErr, field: "contactEmail" };
  const phone = i.contactPhone.trim();
  if (!phone) return { error: "Contact phone is required.", field: "contactPhone" };
  const phoneErr = phoneError(phone);
  if (phoneErr) return { error: phoneErr, field: "contactPhone" };
  const cost = parseAmount(i.cost);
  if (cost === null) return { error: "Cost must be a positive number (up to two decimals).", field: "cost" };
  if (!STATUSES.includes(i.status)) return { error: "Choose a valid status.", field: "status" };
  return {
    row: {
      name,
      category,
      city,
      contact_name: i.contactName.trim() || null,
      contact_email: email,
      contact_phone: phone,
      cost,
      status: i.status,
      notes: i.notes.trim() || null,
    },
  };
}

export async function saveVendor(eventId: string, vendorId: string | null, input: VendorInput): Promise<VendorResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (vendorId && !UUID_RE.test(vendorId)) return { ok: false, error: "Vendor not found." };
  const v = validate(input);
  if ("error" in v) return { ok: false, error: v.error, field: v.field };
  if (!(await emailDomainExists(v.row.contact_email))) {
    return { ok: false, error: "We couldn't find that email domain. Check the part after the @.", field: "contactEmail" };
  }

  const { data, error } = vendorId
    ? await auth.supabase.from("event_vendors").update(v.row).eq("id", vendorId).eq("event_id", eventId).select("id").maybeSingle()
    : await auth.supabase.from("event_vendors").insert({ ...v.row, event_id: eventId }).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "Could not save the vendor. Please try again." };
  return { ok: true };
}

export async function deleteVendor(eventId: string, vendorId: string): Promise<VendorResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!UUID_RE.test(vendorId)) return { ok: false, error: "Vendor not found." };
  const { data, error } = await auth.supabase.from("event_vendors").delete().eq("id", vendorId).eq("event_id", eventId).select("id");
  if (error || !data || data.length === 0) return { ok: false, error: "Could not delete the vendor." };
  return { ok: true };
}
