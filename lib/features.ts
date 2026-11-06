import { notFound } from "next/navigation";

/**
 * Modules kept in the codebase and database but switched off for the MVP.
 * Flip a flag to true to bring the module back; nothing else needs restoring.
 */
export const FEATURES = {
  tasks: false,
  budget: false,
  vendors: false,
  communications: false,
  automations: false,
  analytics: false,
  sponsors: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isEnabled(key: string): boolean {
  return !(key in FEATURES) || FEATURES[key as FeatureKey];
}

/** Call from a route segment's layout so every page under it 404s while the module is off. */
export function requireFeature(key: FeatureKey) {
  if (!FEATURES[key]) notFound();
}
