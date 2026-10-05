"use server";

import { ADMIN_ROLES, authorizeAction } from "@/lib/event-access";
import { parseAmount } from "@/lib/money";
import { UUID_RE } from "@/lib/registration";

export type BudgetInput = { name: string; category: string; estimated: string; actual: string; notes: string };
export type BudgetResult = { ok: true } | { ok: false; error: string; field?: string };

type Validated =
  | { error: string; field: string }
  | { row: { name: string; category: string; estimated_amount: number; actual_amount: number; notes: string | null } };

function validate(i: BudgetInput): Validated {
  const name = i.name.trim();
  const category = i.category.trim();
  if (!name) return { error: "Item name is required.", field: "name" };
  if (name.length > 200) return { error: "Item name must be 200 characters or fewer.", field: "name" };
  if (!category) return { error: "Category is required.", field: "category" };
  if (category.length > 80) return { error: "Category must be 80 characters or fewer.", field: "category" };
  const estimated = parseAmount(i.estimated);
  if (estimated === null) return { error: "Estimated cost must be a positive number (up to two decimals).", field: "estimated" };
  const actual = parseAmount(i.actual);
  if (actual === null) return { error: "Actual cost must be a positive number (up to two decimals).", field: "actual" };
  if (i.notes.length > 2000) return { error: "Notes are too long.", field: "notes" };
  return { row: { name, category, estimated_amount: estimated, actual_amount: actual, notes: i.notes.trim() || null } };
}

export async function saveBudgetItem(eventId: string, itemId: string | null, input: BudgetInput): Promise<BudgetResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (itemId && !UUID_RE.test(itemId)) return { ok: false, error: "Budget item not found." };
  const v = validate(input);
  if ("error" in v) return { ok: false, error: v.error, field: v.field };

  const { data, error } = itemId
    ? await auth.supabase.from("event_budget_items").update(v.row).eq("id", itemId).eq("event_id", eventId).select("id").maybeSingle()
    : await auth.supabase.from("event_budget_items").insert({ ...v.row, event_id: eventId, created_by: auth.userId }).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "Could not save the budget item. Please try again." };
  return { ok: true };
}

export async function deleteBudgetItem(eventId: string, itemId: string): Promise<BudgetResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!UUID_RE.test(itemId)) return { ok: false, error: "Budget item not found." };
  const { data, error } = await auth.supabase.from("event_budget_items").delete().eq("id", itemId).eq("event_id", eventId).select("id");
  if (error || !data || data.length === 0) return { ok: false, error: "Could not delete the budget item." };
  return { ok: true };
}
