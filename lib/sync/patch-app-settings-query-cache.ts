"use client";

import type { QueryClient } from "@tanstack/react-query";
import { resolveCabAppSettingsFromRows } from "@/src/lib/app-settings/resolve-from-rows";
import { setRuntimeCabAppSettingsPayload } from "@/src/lib/app-settings/runtime-settings-cache";
import type { CabAppSettingsQueryPayload } from "@/src/hooks/gestionale/use-settings-queries";
import { QK } from "@/src/lib/react-query/query-keys";
import type { AppSettingRow } from "@/src/types/supabase-tables";

/** SSOT query key impostazioni globali (payload + resolved). */
export const SETTINGS_PAYLOAD_QK = [...QK.settings, "payload"] as const;

function settingsRowKey(row: { module: string; key: string }): string {
  return `${row.module}::${row.key}`;
}

function mergeSettingsRows(
  current: readonly AppSettingRow[],
  upserted: readonly AppSettingRow[],
): AppSettingRow[] {
  const map = new Map(current.map((r) => [settingsRowKey(r), r]));
  for (const row of upserted) {
    map.set(settingsRowKey(row), row);
  }
  return [...map.values()];
}

/** Normalizza output write `persistSettingsRecord` (singola riga o batch). */
export function normalizeUpsertedSettingsRows(data: unknown): AppSettingRow[] {
  if (data == null) return [];
  if (Array.isArray(data)) {
    return data.filter((r): r is AppSettingRow => Boolean(r && typeof r === "object" && "module" in r));
  }
  if (typeof data === "object" && "module" in data) {
    return [data as AppSettingRow];
  }
  return [];
}

/**
 * Patch sincrona cache SSOT dopo write DB confermato.
 * Merge righe + `resolveCabAppSettingsFromRows` — nessun concat naive.
 */
export function patchAppSettingsQueryCache(
  qc: QueryClient,
  upsertedRows: readonly AppSettingRow[],
): CabAppSettingsQueryPayload | null {
  if (upsertedRows.length === 0) return null;

  const current = qc.getQueryData<CabAppSettingsQueryPayload>(SETTINGS_PAYLOAD_QK);
  const mergedRows = mergeSettingsRows(current?.rows ?? [], upsertedRows);
  const resolved = resolveCabAppSettingsFromRows(mergedRows, current?.resolved ?? null);
  const payload: CabAppSettingsQueryPayload = { rows: mergedRows, resolved };

  qc.setQueryData(SETTINGS_PAYLOAD_QK, payload);
  setRuntimeCabAppSettingsPayload(payload);
  return payload;
}
