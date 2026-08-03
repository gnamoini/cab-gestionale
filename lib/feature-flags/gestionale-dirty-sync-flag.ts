/**
 * Feature flag dirty sync — refresh manuale su segnale remoto.
 * Override env: NEXT_PUBLIC_GESTIONALE_DIRTY_SYNC=off|pilot_lavorazioni|pilot_heavy|all
 */

import type { GestionaleSyncDomain } from "@/lib/sync/gestionale-sync-scope";

export const GESTIONALE_DIRTY_SYNC_MODULE = "system" as const;
export const GESTIONALE_DIRTY_SYNC_KEY = "gestionale_dirty_sync_mode" as const;

export type GestionaleDirtySyncMode = "off" | "pilot_lavorazioni" | "pilot_heavy" | "all";

const VALID_MODES = new Set<GestionaleDirtySyncMode>([
  "off",
  "pilot_lavorazioni",
  "pilot_heavy",
  "all",
]);

export function parseGestionaleDirtySyncMode(value: unknown): GestionaleDirtySyncMode | null {
  if (typeof value !== "string") return null;
  const v = value.trim() as GestionaleDirtySyncMode;
  return VALID_MODES.has(v) ? v : null;
}

type AppSettingsRowLike = { module?: string | null; key?: string | null; value?: unknown };

export function readGestionaleDirtySyncModeFromRows(
  rows: AppSettingsRowLike[] | undefined,
): GestionaleDirtySyncMode | null {
  if (!rows?.length) return null;
  const row = rows.find((r) => r.module === GESTIONALE_DIRTY_SYNC_MODULE && r.key === GESTIONALE_DIRTY_SYNC_KEY);
  if (!row) return null;
  if (typeof row.value === "string") return parseGestionaleDirtySyncMode(row.value);
  return null;
}

/** Default pilot_heavy — env vince su DB. Impostare `off` per rollback. */
export function resolveGestionaleDirtySyncMode(dbMode?: GestionaleDirtySyncMode | null): GestionaleDirtySyncMode {
  const env = process.env.NEXT_PUBLIC_GESTIONALE_DIRTY_SYNC?.trim();
  if (env) {
    const parsed = parseGestionaleDirtySyncMode(env);
    if (parsed) return parsed;
  }
  if (dbMode) return dbMode;
  return "pilot_heavy";
}

/** ponytail: module singleton — upgrade: inject da AppSettingsQueryProvider. */
let runtimeMode: GestionaleDirtySyncMode = resolveGestionaleDirtySyncMode();

export function setGestionaleDirtySyncModeRuntime(mode: GestionaleDirtySyncMode): void {
  runtimeMode = mode;
}

export function getGestionaleDirtySyncMode(): GestionaleDirtySyncMode {
  return runtimeMode;
}

export function isGestionaleDirtySyncEnabled(): boolean {
  return getGestionaleDirtySyncMode() !== "off";
}

const PILOT_LAVORAZIONI_DOMAINS: readonly GestionaleSyncDomain[] = ["lavorazioni"];

const PILOT_HEAVY_DOMAINS: readonly GestionaleSyncDomain[] = [
  "lavorazioni",
  "dashboard",
  "magazzino",
  "report",
  "portale",
];

const ALL_DIRTY_DOMAINS: readonly GestionaleSyncDomain[] = [
  "lavorazioni",
  "magazzino",
  "dashboard",
  "report",
  "mezzi",
  "preventivi",
  "documenti",
  "dipendenti",
  "impostazioni",
  "portale",
];

/** Domini che restano live anche con flag `all`. */
export const ALWAYS_LIVE_SYNC_DOMAINS: readonly GestionaleSyncDomain[] = ["sicurezza", "agenda"];

export function isDirtySyncEnabledForDomain(domain: GestionaleSyncDomain): boolean {
  const mode = getGestionaleDirtySyncMode();
  if (mode === "off") return false;
  if (ALWAYS_LIVE_SYNC_DOMAINS.includes(domain)) return false;
  if (mode === "pilot_lavorazioni") return PILOT_LAVORAZIONI_DOMAINS.includes(domain);
  if (mode === "pilot_heavy") return PILOT_HEAVY_DOMAINS.includes(domain);
  return ALL_DIRTY_DOMAINS.includes(domain);
}
