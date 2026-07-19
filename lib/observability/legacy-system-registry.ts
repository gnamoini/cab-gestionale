/**
 * SSOT legacy architecture sunset tracking (Bucket 3).
 * Owner obbligatorio — nessun sunset senza responsabile.
 */
export interface LegacySystem {
  name: string;
  owner: string;
  replacement: string;
  sunsetDate: string;
  rollbackPlan: string;
  bucket: 3;
}

export const LEGACY_SYSTEM_REGISTRY: readonly LegacySystem[] = [
  {
    name: "notifications-dual-write",
    owner: "notifications",
    replacement: "SSOT v4 pipeline",
    sunsetDate: "TBD",
    rollbackPlan: "NEXT_PUBLIC_NOTIFICATIONS_SSOT_V2=off",
    bucket: 3,
  },
  {
    name: "notifications-localstorage",
    owner: "notifications",
    replacement: "DB inbox v2",
    sunsetDate: "TBD",
    rollbackPlan: "NEXT_PUBLIC_NOTIFICATIONS_V2=off",
    bucket: 3,
  },
  {
    name: "form-ux-legacy",
    owner: "forms",
    replacement: "form-ux-migration",
    sunsetDate: "TBD",
    rollbackPlan: "NEXT_PUBLIC_FORM_UX_MIGRATION=0",
    bucket: 3,
  },
  {
    name: "magazzino-compat",
    owner: "inventory",
    replacement: "compat SSOT gate off",
    sunsetDate: "TBD",
    rollbackPlan: "compat-write-gate bypass review",
    bucket: 3,
  },
  {
    name: "mezzi-legacy-attrezzatura",
    owner: "mezzi",
    replacement: "mezzo_attrezzature_v2",
    sunsetDate: "TBD",
    rollbackPlan: "NEXT_PUBLIC_MEZZO_ATTREZZATURE_V2=0",
    bucket: 3,
  },
  {
    name: "preventivi-localstorage",
    owner: "preventivi",
    replacement: "DB primary",
    sunsetDate: "TBD",
    rollbackPlan: "NEXT_PUBLIC_PREVENTIVI_DB_PRIMARY=false",
    bucket: 3,
  },
  {
    name: "gestionale-dirty-sync",
    owner: "sync",
    replacement: "version-bump refresh",
    sunsetDate: "TBD",
    rollbackPlan: "NEXT_PUBLIC_GESTIONALE_DIRTY_SYNC=off",
    bucket: 3,
  },
  {
    name: "ui-os-backward-adapter",
    owner: "ui",
    replacement: "ui-os-engine",
    sunsetDate: "TBD",
    rollbackPlan: "NEXT_PUBLIC_CAB_UI_OS≠1",
    bucket: 3,
  },
] as const;

export function getLegacySystem(name: string): LegacySystem | undefined {
  return LEGACY_SYSTEM_REGISTRY.find((s) => s.name === name);
}
