"use client";

import { useState, useTransition } from "react";
import { createOrganization } from "@/app/dashboard/org/actions";
import { btnPrimary, inputCls } from "@/components/eventjini/classes";
import { ORG_NAME_MAX } from "@/lib/roles";

export function CreateOrgForm() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const r = await createOrganization(name);
          if (r && !r.ok) setError(r.error);
        });
      }}
    >
      <label className="block space-y-1 text-sm font-medium text-foreground">
        Organization name
        <input
          className={inputCls}
          value={name}
          maxLength={ORG_NAME_MAX}
          placeholder="e.g. Acme Events"
          autoFocus
          required
          onChange={(e) => setName(e.target.value)}
        />
        <span className="block text-xs font-normal text-muted-foreground">Your company, club or team. You can change it later.</span>
      </label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={pending || !name.trim()} className={btnPrimary}>
        {pending ? "Creating..." : "Create organization"}
      </button>
    </form>
  );
}
