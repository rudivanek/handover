import presets from '@/data/maintenance-presets.json';
import type { MaintenanceCadence, MaintenanceOwner, Locale } from '@/lib/types';

export type MaintenancePreset = {
  key: string;
  cadence: MaintenanceCadence;
  owner: MaintenanceOwner;
  en: string;
  es: string;
};

export const MAINTENANCE_PRESETS = presets as MaintenancePreset[];

const BY_KEY = new Map(MAINTENANCE_PRESETS.map((p) => [p.key, p]));

/** Preset text in the given locale. Returns null for an unknown key. */
export function presetText(key: string | null | undefined, locale: Locale): string | null {
  if (!key) return null;
  const p = BY_KEY.get(key);
  if (!p) return null;
  return locale === 'es' ? p.es : p.en;
}
