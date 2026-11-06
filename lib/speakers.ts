export const SPEAKER_SOCIAL_KEYS = ["linkedin", "x", "website"] as const;
export type SpeakerSocialKey = (typeof SPEAKER_SOCIAL_KEYS)[number];
export const SPEAKER_SOCIAL_LABELS: Record<SpeakerSocialKey, string> = { linkedin: "LinkedIn", x: "X (Twitter)", website: "Website" };

export type SpeakerRow = {
  id: string;
  event_id: string;
  name: string;
  designation: string | null;
  organization: string | null;
  bio: string | null;
  photo_url: string | null;
  social_links: Partial<Record<SpeakerSocialKey, string>>;
  is_featured: boolean;
  sort_order: number;
};

export type SpeakerInput = {
  name: string;
  designation: string;
  organization: string;
  bio: string;
  isFeatured: boolean;
  socialLinks: Record<SpeakerSocialKey, string>;
};

export const SPEAKER_LIMITS = { name: 120, designation: 120, organization: 120, bio: 2000 } as const;

export function emptySpeakerInput(): SpeakerInput {
  return {
    name: "",
    designation: "",
    organization: "",
    bio: "",
    isFeatured: false,
    socialLinks: { linkedin: "", x: "", website: "" },
  };
}

export function speakerToInput(s: SpeakerRow): SpeakerInput {
  return {
    name: s.name,
    designation: s.designation ?? "",
    organization: s.organization ?? "",
    bio: s.bio ?? "",
    isFeatured: s.is_featured,
    socialLinks: { ...emptySpeakerInput().socialLinks, ...(s.social_links ?? {}) },
  };
}

/** "Head of AI, Acme" / "Head of AI" / "Acme" / "" */
export function speakerTitleLine(s: Pick<SpeakerRow, "designation" | "organization">): string {
  return [s.designation, s.organization].filter(Boolean).join(", ");
}

export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function validateSpeaker(v: SpeakerInput):
  | { ok: true; row: Omit<SpeakerRow, "id" | "event_id" | "photo_url" | "sort_order"> }
  | { ok: false; error: string } {
  const name = v.name.trim();
  if (!name) return { ok: false, error: "Speaker name is required." };
  for (const k of ["name", "designation", "organization", "bio"] as const) {
    if (v[k].trim().length > SPEAKER_LIMITS[k]) return { ok: false, error: `${k[0].toUpperCase()}${k.slice(1)} must be ${SPEAKER_LIMITS[k]} characters or fewer.` };
  }
  const social_links: SpeakerRow["social_links"] = {};
  for (const k of SPEAKER_SOCIAL_KEYS) {
    const raw = v.socialLinks[k]?.trim();
    if (!raw) continue;
    try {
      const u = new URL(raw);
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
      social_links[k] = raw;
    } catch {
      return { ok: false, error: `${SPEAKER_SOCIAL_LABELS[k]} must be a full link starting with https://` };
    }
  }
  return {
    ok: true,
    row: {
      name,
      designation: v.designation.trim() || null,
      organization: v.organization.trim() || null,
      bio: v.bio.trim() || null,
      is_featured: v.isFeatured,
      social_links,
    },
  };
}
