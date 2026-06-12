"use client";

import type { SistemaPreventiviDefaults } from "@/lib/sistema/sistema-preventivi-defaults-storage";
import type { CabAppSettingsResolved } from "@/src/lib/app-settings/resolve-from-rows";
import type { AppSettingRow } from "@/src/types/supabase-tables";

const RESOLVED_STORAGE_KEY = "cab.runtime.settings.resolved.v1";
const PAYLOAD_STORAGE_KEY = "cab.runtime.settings.payload.v1";
const FINGERPRINT_STORAGE_KEY = "cab.runtime.settings.fingerprint.v1";

export type RuntimeCabAppSettingsPayload = {
  rows: AppSettingRow[];
  resolved: CabAppSettingsResolved;
};

let resolved: CabAppSettingsResolved | null = null;
let payload: RuntimeCabAppSettingsPayload | null = null;
let fingerprint: string | null = null;

/** Versione cache sessionStorage da max `updated_at` righe settings. */
export function computeSettingsPayloadFingerprint(rows: readonly AppSettingRow[]): string {
  let max = "";
  for (const row of rows) {
    const u = row.updated_at?.trim() ?? "";
    if (u > max) max = u;
  }
  return max || `rows:${rows.length}`;
}

function readJson<T>(key: string): T | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

function removeJson(key: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function hydrateFromSessionStorage(): void {
  if (fingerprint == null) {
    fingerprint = readJson<string>(FINGERPRINT_STORAGE_KEY);
  }
  if (resolved == null) {
    resolved = readJson<CabAppSettingsResolved>(RESOLVED_STORAGE_KEY);
  }
  if (payload == null) {
    payload = readJson<RuntimeCabAppSettingsPayload>(PAYLOAD_STORAGE_KEY);
    if (payload?.resolved && resolved == null) {
      resolved = payload.resolved;
    }
    if (payload?.rows?.length && !fingerprint) {
      fingerprint = computeSettingsPayloadFingerprint(payload.rows);
    }
  }
}

hydrateFromSessionStorage();

export function getRuntimeSettingsFingerprint(): string | null {
  if (fingerprint == null) hydrateFromSessionStorage();
  return fingerprint;
}

export function setRuntimeCabAppSettings(next: CabAppSettingsResolved | null): void {
  resolved = next;
  if (next) writeJson(RESOLVED_STORAGE_KEY, next);
  else removeJson(RESOLVED_STORAGE_KEY);
}

export function getRuntimeCabAppSettings(): CabAppSettingsResolved | null {
  if (resolved == null) hydrateFromSessionStorage();
  return resolved;
}

export function setRuntimeCabAppSettingsPayload(next: RuntimeCabAppSettingsPayload | null): void {
  payload = next;
  if (next) {
    resolved = next.resolved;
    fingerprint = computeSettingsPayloadFingerprint(next.rows);
    writeJson(PAYLOAD_STORAGE_KEY, next);
    writeJson(RESOLVED_STORAGE_KEY, next.resolved);
    writeJson(FINGERPRINT_STORAGE_KEY, fingerprint);
  } else {
    removeJson(PAYLOAD_STORAGE_KEY);
    removeJson(RESOLVED_STORAGE_KEY);
    removeJson(FINGERPRINT_STORAGE_KEY);
    resolved = null;
    fingerprint = null;
  }
}

export function getRuntimeCabAppSettingsPayload(): RuntimeCabAppSettingsPayload | null {
  if (payload == null) hydrateFromSessionStorage();
  return payload;
}

export function clearRuntimeCabAppSettings(): void {
  resolved = null;
  payload = null;
  fingerprint = null;
  removeJson(RESOLVED_STORAGE_KEY);
  removeJson(PAYLOAD_STORAGE_KEY);
  removeJson(FINGERPRINT_STORAGE_KEY);
}

const DEFAULT_PREVENTIVI: SistemaPreventiviDefaults = { costoOrarioDefault: 48 };

export function getRuntimePreventiviDefaults(): SistemaPreventiviDefaults {
  const cached = getRuntimeCabAppSettings();
  if (cached?.preventiviDefaults) return cached.preventiviDefaults;
  return DEFAULT_PREVENTIVI;
}
