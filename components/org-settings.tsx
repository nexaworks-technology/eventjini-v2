"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { deleteOrganization, renameOrganization, setOrganizationLogo } from "@/app/dashboard/org/actions";
import { useConfirm } from "@/components/eventjini/confirm-dialog";
import { btnDanger, btnPrimary, btnSecondarySm, inputCls } from "@/components/eventjini/classes";
import { FormSection } from "@/components/eventjini/form-section";
import { OrgLogo } from "@/components/eventjini/org-switcher";
import { ORG_NAME_MAX, type Organization } from "@/lib/roles";
import { createClient } from "@/utils/supabase/client";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 2 * 1024 * 1024;

type Msg = { ok: boolean; text: string } | null;

export function OrgSettings({ org, eventCount }: { org: Organization; eventCount: number }) {
  const router = useRouter();
  const confirm = useConfirm();
  const canEdit = org.role === "owner" || org.role === "admin";
  const [name, setName] = useState(org.name);
  const [nameMsg, setNameMsg] = useState<Msg>(null);
  const [logoMsg, setLogoMsg] = useState<Msg>(null);
  const [deleteMsg, setDeleteMsg] = useState<Msg>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function saveName() {
    setNameMsg(null);
    startTransition(async () => {
      const r = await renameOrganization(org.id, name);
      setNameMsg(r.ok ? { ok: true, text: "Name saved." } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });
  }

  async function upload(file: File) {
    setLogoMsg(null);
    const ext = TYPES[file.type];
    if (!ext) return setLogoMsg({ ok: false, text: "Use a JPEG, PNG or WebP image." });
    if (file.size > MAX_BYTES) return setLogoMsg({ ok: false, text: "That image is larger than 2 MB. Choose a smaller file." });
    setUploading(true);
    try {
      const path = `orgs/${org.id}/logo/${crypto.randomUUID()}.${ext}`;
      const { error } = await createClient().storage.from("event-assets").upload(path, file, { contentType: file.type, upsert: false });
      if (error) return setLogoMsg({ ok: false, text: "Upload failed. You may not have permission, or the file was rejected." });
      const r = await setOrganizationLogo(org.id, path);
      setLogoMsg(r.ok ? { ok: true, text: "Logo updated." } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    } catch {
      setLogoMsg({ ok: false, text: "Upload failed. Please try again." });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeLogo() {
    startTransition(async () => {
      const r = await setOrganizationLogo(org.id, null);
      setLogoMsg(r.ok ? { ok: true, text: "Logo removed." } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });
  }

  async function remove() {
    if (!(await confirm({ title: `Delete ${org.name}?`, description: "This can't be undone.", destructive: true }))) return;
    startTransition(async () => {
      const r = await deleteOrganization(org.id);
      if (r && !r.ok) setDeleteMsg({ ok: false, text: r.error });
    });
  }

  const note = (m: Msg) => m && <p role={m.ok ? "status" : "alert"} className={`text-sm ${m.ok ? "text-success" : "text-destructive"}`}>{m.text}</p>;

  return (
    <div className="space-y-6">
      <FormSection title="General" description={canEdit ? undefined : "Only owners and admins can change these."}>
        <label className="block space-y-1 text-sm font-medium text-foreground">
          Organization name
          <input className={inputCls} value={name} maxLength={ORG_NAME_MAX} disabled={!canEdit} onChange={(e) => setName(e.target.value)} />
        </label>
        {canEdit && (
          <button type="button" onClick={saveName} disabled={pending || !name.trim() || name.trim() === org.name} className={btnPrimary}>
            Save name
          </button>
        )}
        {note(nameMsg)}
      </FormSection>

      <FormSection title="Logo" description="Shown in the organization switcher. Square images work best (JPEG, PNG or WebP, up to 2 MB).">
        <div className="flex flex-wrap items-center gap-3">
          <OrgLogo org={org} className="size-14 rounded-xl text-xl" />
          {canEdit && (
            <>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="org-logo" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              <label htmlFor="org-logo" className={`${btnSecondarySm} cursor-pointer`}>{uploading ? "Uploading..." : org.logo_url ? "Replace logo" : "Upload logo"}</label>
              {org.logo_url && (
                <button type="button" onClick={removeLogo} disabled={pending} className="text-sm text-muted-foreground underline hover:text-foreground">Remove</button>
              )}
            </>
          )}
        </div>
        {note(logoMsg)}
      </FormSection>

      {org.role === "owner" && (
        <FormSection title="Delete organization" description={eventCount > 0 ? `This organization has ${eventCount} event${eventCount === 1 ? "" : "s"}, so it can't be deleted.` : "Removes the organization and everyone's access to it."}>
          <button type="button" onClick={remove} disabled={pending || eventCount > 0} className={btnDanger}>Delete organization</button>
          {note(deleteMsg)}
        </FormSection>
      )}
    </div>
  );
}
