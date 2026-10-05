"use server";

import { ADMIN_ROLES, authorizeAction } from "@/lib/event-access";
import { parseAmount } from "@/lib/money";
import { UUID_RE } from "@/lib/registration";

export type VendorStatus = "prospect" | "confirmed" | "completed" | "cancelled";
export type VendorInput = { name: string; category: string; contactName: string; contactEmail: string; contactPhone: string; cost: string; status: VendorStatus; notes: string };
export type VendorResult = { ok: true } | { ok: false; error: string; field?: string };

const STATUSES: VendorStatus[] = ["prospect", "confirmed", "completed", "cancelled"];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Validated =
  | { error: string; field: string }
  | { row: { name: string; category: string; contact_name: string | null; contact_email: string | null; contact_phone: string | null; cost: number; status: VendorStatus; notes: string | null } };

function validate(i: VendorInput): Validated {
  const name = i.name.trim();
  const category = i.category.trim();
  if (!name) return { error: "Vendor name is required.", field: "name" };
  if (name.length > 200) return { error: "Vendor name must be 200 characters or fewer.", field: "name" };
  if (!category) return { error: "Category is required.", field: "category" };
  if (category.length > 80) return { error: "Category must be 80 characters or fewer.", field: "category" };
  const email = i.contactEmail.trim();
  if (email && !EMAIL_RE.test(email)) return { error: "Enter a valid contact email.", field: "contactEmail" };
  const cost = parseAmount(i.cost);
  if (cost === null) return { error: "Cost must be a positive number (up to two decimals).", field: "cost" };
  if (!STATUSES.includes(i.status)) return { error: "Choose a valid status.", field: "status" };
  return {
    row: {
      name,
      category,
      contact_name: i.contactName.trim() || null,
      contact_email: email || null,
      contact_phone: i.contactPhone.trim() || null,
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
