"use client";

import { useLayoutEffect } from "react";
import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { persistSettingsRecord } from "@/lib/sync/persist-settings-record";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { resolveCabAppSettingsFromRows, type CabAppSettingsResolved } from "@/src/lib/app-settings/resolve-from-rows";
import {
  getRuntimeCabAppSettingsPayload,
  setRuntimeCabAppSettings,
  setRuntimeCabAppSettingsPayload,
} from "@/src/lib/app-settings/runtime-settings-cache";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";
import {
  mergeAppSettingsUpsertWithVersions,
  SETTINGS_CONCURRENCY_CONFLICT,
  settingsService,
  type AppSettingsUpsertInput,
} from "@/src/services/settings.service";
import type { AppSettingRow } from "@/src/types/supabase-tables";

export type CabAppSettingsQueryPayload = {
  rows: AppSettingRow[];
  resolved: CabAppSettingsResolved;
};

export async function fetchCabAppSettingsPayload(): Promise<CabAppSettingsQueryPayload> {
  const startedAt = Date.now();
  try {
    const r = await settingsService.getAllSettings();
    if (!r.success) throw new Error(r.error ?? "Errore lettura impostazioni");
    const rows: AppSettingRow[] = r.data ?? [];
    const result = { rows, resolved: resolveCabAppSettingsFromRows(rows, null) };
    return result;
  } catch (error) {
    throw error;
  }
}

/** Impostazioni globali: righe DB + oggetto risolto (OCC su `rows[].updated_at`). */
export function useCabAppSettingsPayloadQuery(options?: {
  enabled?: boolean;
  /** Combobox globali: elenco sempre aggiornato (default 30s). */
  staleTime?: number;
}): UseQueryResult<CabAppSettingsQueryPayload, Error> {
  const enabled = (options?.enabled ?? true) && isSupabasePublicEnvConfigured();
  const cachedPayload = getRuntimeCabAppSettingsPayload();
  const q = useQuery({
    queryKey: [...QK.settings, "payload"] as const,
    queryFn: fetchCabAppSettingsPayload,
    enabled,
    staleTime: options?.staleTime ?? 30_000,
    gcTime: 86_400_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
    initialData: cachedPayload ?? undefined,
    placeholderData: (previousData) => previousData ?? cachedPayload ?? undefined,
  });
  useLayoutEffect(() => {
    if (!q.data?.resolved) return;
    setRuntimeCabAppSettings(q.data.resolved);
    setRuntimeCabAppSettingsPayload(q.data);
  }, [q.data]);
  return q;
}

function useSettingsConflictToast() {
  const gestToast = useGestionaleToast();
  return (message: string) => {
    if (message === SETTINGS_CONCURRENCY_CONFLICT) {
      gestToast.warning("Impostazioni aggiornate da un altro utente. Ricarica per vedere le modifiche.");
    }
  };
}

export function useSettingsBulkMutation() {
  const qc = useQueryClient();
  const onConflict = useSettingsConflictToast();
  return useServiceMutation(
    (rows: AppSettingsUpsertInput[]) => persistSettingsRecord(qc, () => settingsService.bulkUpsertSettings(rows)),
    {
      onError: (e) => {
        onConflict(e.message);
      },
    },
  );
}

export function useSettingsUpsertMutation() {
  const qc = useQueryClient();
  const onConflict = useSettingsConflictToast();
  return useServiceMutation(
    (input: AppSettingsUpsertInput) => persistSettingsRecord(qc, () => settingsService.upsertSetting(input)),
    {
      onError: (e) => {
        onConflict(e.message);
      },
    },
  );
}

export { mergeAppSettingsUpsertWithVersions, persistSettingsRecord, SETTINGS_CONCURRENCY_CONFLICT };
