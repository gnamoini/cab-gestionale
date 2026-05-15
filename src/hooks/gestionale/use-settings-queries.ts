"use client";

import { useLayoutEffect } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useToast } from "@/context/toast-context";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { resolveCabAppSettingsFromRows, type CabAppSettingsResolved } from "@/src/lib/app-settings/resolve-from-rows";
import { setRuntimeCabAppSettings } from "@/src/lib/app-settings/runtime-settings-cache";
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

async function fetchCabAppSettingsPayload(): Promise<CabAppSettingsQueryPayload> {
  const r = await settingsService.getAllSettings();
  if (!r.success) throw new Error(r.error ?? "Errore lettura impostazioni");
  const rows: AppSettingRow[] = r.data ?? [];
  return { rows, resolved: resolveCabAppSettingsFromRows(rows, null) };
}

/** Impostazioni globali: righe DB + oggetto risolto (OCC su `rows[].updated_at`). */
export function useCabAppSettingsPayloadQuery(options?: { enabled?: boolean }): UseQueryResult<CabAppSettingsQueryPayload, Error> {
  const enabled = (options?.enabled ?? true) && isSupabasePublicEnvConfigured();
  const q = useQuery({
    queryKey: [...QK.settings, "payload"] as const,
    queryFn: fetchCabAppSettingsPayload,
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 86_400_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
  useLayoutEffect(() => {
    if (q.data?.resolved) setRuntimeCabAppSettings(q.data.resolved);
  }, [q.data?.resolved]);
  return q;
}

function useSettingsConflictToast() {
  const { push } = useToast();
  return (message: string) => {
    if (message === SETTINGS_CONCURRENCY_CONFLICT) {
      push("Impostazioni aggiornate da un altro utente", "warning", 5200);
    }
  };
}

export function useSettingsBulkMutation() {
  const onConflict = useSettingsConflictToast();
  return useServiceMutation((rows: AppSettingsUpsertInput[]) => settingsService.bulkUpsertSettings(rows), {
    invalidateQueryKeys: [[...QK.settings]],
    onError: (e) => {
      onConflict(e.message);
    },
  });
}

export function useSettingsUpsertMutation() {
  const onConflict = useSettingsConflictToast();
  return useServiceMutation((input: AppSettingsUpsertInput) => settingsService.upsertSetting(input), {
    invalidateQueryKeys: [[...QK.settings]],
    onError: (e) => {
      onConflict(e.message);
    },
  });
}

export { mergeAppSettingsUpsertWithVersions, SETTINGS_CONCURRENCY_CONFLICT };
