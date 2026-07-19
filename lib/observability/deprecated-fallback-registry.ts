/**
 * SSOT for fallback retirement policy (dead-code audit).
 * Each fallback must declare owner + removal condition before sunset.
 */
export interface DeprecatedFallback {
  name: string;
  owner: string;
  introduced: string;
  reason: string;
  removalCondition: string;
  telemetryRequired: boolean;
  bucket: 2 | 3;
}

export const DEPRECATED_FALLBACK_REGISTRY: readonly DeprecatedFallback[] = [
  {
    name: "selector-safe-fallback",
    owner: "selector",
    introduced: "2026-05",
    reason: "compatibilità migration selector-core",
    removalCondition: "0 fallback hit per 30 giorni",
    telemetryRequired: true,
    bucket: 2,
  },
  {
    name: "notification-localstorage-fallback",
    owner: "notifications",
    introduced: "2026-03",
    reason: "dual-write inbox localStorage → DB",
    removalCondition: "NOTIFICATIONS_V2=on prod + 0 hit per 30 giorni",
    telemetryRequired: true,
    bucket: 3,
  },
  {
    name: "pdf-preview-get",
    owner: "pdf",
    introduced: "2026-04",
    reason: "GET token legacy; POST blob primary",
    removalCondition: "POST primary + 0 GET hit per 30 giorni",
    telemetryRequired: true,
    bucket: 2,
  },
  {
    name: "magazzino-compat-write",
    owner: "inventory",
    introduced: "2026-06",
    reason: "compat SSOT write gate",
    removalCondition: "compat-ssot green + 0 hit per 30 giorni",
    telemetryRequired: true,
    bucket: 3,
  },
  {
    name: "publish-notification-dual-write",
    owner: "notifications",
    introduced: "2026-09",
    reason: "SSOT v4 migration dual-write",
    removalCondition: "SSOT v4 stable + 0 dual-write per 30 giorni",
    telemetryRequired: true,
    bucket: 3,
  },
] as const;

export function getDeprecatedFallback(name: string): DeprecatedFallback | undefined {
  return DEPRECATED_FALLBACK_REGISTRY.find((f) => f.name === name);
}
