"use server";

import { redirect } from "next/navigation";
import { fieldKeyFromLabel, UUID_RE, type FieldType } from "@/lib/registration";
import { createClient } from "@/utils/supabase/server";

export type FieldInput = {
  key?: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string[];
};

export type SaveFormResult = { ok: true } | { ok: false; error: string };

const TYPES: FieldType[] = ["text", "long_text", "dropdown", "checkbox"];
const KEY_RE = /^[a-z][a-z0-9_]{0,63}$/;

export async function saveRegistrationForm(
  eventId: string,
  settings: { requiresApproval: boolean; requireB2bData: boolean },
  fields: FieldInput[]
): Promise<SaveFormResult> {
  if (!UUID_RE.test(eventId)) return { ok: false, error: "Event not found." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/login");

  if (fields.length > 30) return { ok: false, error: "A form can have at most 30 custom questions." };

  const taken = new Set<string>();
  for (const f of fields) if (f.key && KEY_RE.test(f.key)) taken.add(f.key);

  const payload: {
    field_key: string;
    label: string;
    field_type: FieldType;
    required: boolean;
    options: string[] | null;
  }[] = [];
  const used = new Set<string>();

  for (const f of fields) {
    const label = f.label.trim();
    if (!label) return { ok: false, error: "Every custom question needs a label." };
    if (label.length > 200) return { ok: false, error: "Question labels must be 200 characters or fewer." };
    if (!TYPES.includes(f.type)) return { ok: false, error: "Invalid question type." };

    let options: string[] | null = null;
    if (f.type === "dropdown") {
      options = Array.from(new Set(f.options.map((o) => o.trim()).filter(Boolean)));
      if (options.length === 0) return { ok: false, error: `"${label}" needs at least one dropdown option.` };
      if (options.length > 50) return { ok: false, error: `"${label}" has too many options (max 50).` };
    }

    let key = f.key && KEY_RE.test(f.key) ? f.key : fieldKeyFromLabel(label, new Set([...taken, ...used]));
    if (used.has(key)) key = fieldKeyFromLabel(label, new Set([...taken, ...used]));
    used.add(key);
    taken.add(key);

    payload.push({
      field_key: key,
      label,
      field_type: f.type,
      required: f.required,
      options,
    });
  }

  const { error } = await supabase.rpc("save_registration_form", {
    p_event_id: eventId,
    p_requires_approval: settings.requiresApproval,
    p_require_b2b_data: settings.requireB2bData,
    p_fields: payload,
  });

  if (error) {
    if (error.message?.includes("NOT_FOUND")) return { ok: false, error: "Event not found or you do not have access to it." };
    return { ok: false, error: "Could not save the registration form. Please try again." };
  }
  return { ok: true };
}
