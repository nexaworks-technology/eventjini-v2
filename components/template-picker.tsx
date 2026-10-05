"use client";

import { EMAIL_TEMPLATES, type EmailTemplate } from "@/lib/email/templates";
import { inputCls } from "@/components/eventjini/classes";

export function TemplatePicker({
  use,
  onPick,
}: {
  use: EmailTemplate["use"][number];
  onPick: (t: EmailTemplate) => void;
}) {
  const sorted = [...EMAIL_TEMPLATES].sort((a, b) => Number(b.use.includes(use)) - Number(a.use.includes(use)));
  return (
    <label className="block space-y-1 text-sm font-medium text-foreground">
      Start from a template
      <select
        className={inputCls}
        value=""
        onChange={(e) => {
          const t = EMAIL_TEMPLATES.find((x) => x.id === e.target.value);
          if (t) onPick(t);
        }}
      >
        <option value="">Choose a template...</option>
        {sorted.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} — {t.description}
          </option>
        ))}
      </select>
    </label>
  );
}
