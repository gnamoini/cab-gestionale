"use client";

import { useLayoutEffect } from "react";
import { useQuery, useQueryClient, type QueryClient, type UseQueryResult } from "@tanstack/react-query";
import { recordQueryFetch } from "@/lib/observability/query-fetch-counter";
import { dedupQuery } from "@/lib/query/dedup-query";
import { staticQueryOpts } from "@/lib/react-query/data-cache-tiers";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { persistSettingsRecord } from "@/lib/sync/persist-settings-record";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { resolveCabAppSettingsFromRows, type CabAppSettingsResolved } from "@/src/lib/app-settings/resolve-from-rows";
import {
  computeSettingsPayloadFingerprint,
  getRuntimeCabAppSettingsPayload,
  getRuntimeSettingsFingerprint,
  setRuntimeCabAppSettings,
  setRuntimeCabAppSettingsPayload,
} from "@/src/lib/app-settings/runtime-settings-cache";
import { useSharedAppSettingsQuery } from "@/src/context/app-settings-query-context";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";
import {
  mergeAppSettingsUpsertWithVersions,
  SETTINGS_CONCURRENCY_CONFLICT,
  settingsEntry,
  type AppSettingsUpsertInput,
} from "@/lib/domain/settings-entry";
import type { AppSettingRow } from "@/src/types/supabase-tables";
import { err, type ServiceResult } from "@/src/services/service-result";

export type CabAppSettingsQueryPayload = {
  rows: AppSettingRow[];
  resolved: CabAppSettingsResolved;
};

const SETTINGS_PAYLOAD_QK = [...QK.settings, "payload"] as const;
const APP_SETTINGS_OCC_MAX_ATTEMPTS = 3;

async function fetchFreshSettingsRows(qc: QueryClient): Promise<AppSettingRow[]> {
  const payload = await qc.fetchQuery({
    queryKey: SETTINGS_PAYLOAD_QK,
    queryFn: fetchCabAppSettingsPayload,
    staleTime: 0,
  });
  return payload.rows;
}

async function persistSettingsUpsertWithOccRetry(
  qc: QueryClient,
  input: AppSettingsUpsertInput,
): Promise<ServiceResult<AppSettingRow>> {
  const { module, key, value } = input;
  for (let attempt = 0; attempt < APP_SETTINGS_OCC_MAX_ATTEMPTS; attempt += 1) {
    const rows = await fetchFreshSettingsRows(qc);
    const resolved = mergeAppSettingsUpsertWithVersions([{ module, key, value }], rows)[0];
    if (!resolved) return err("Aggiornamento impostazioni fallito.");
    const result = await persistSettingsRecord(qc, () => settingsEntry.upsertSetting(resolved));
    if (result.success) return result;
    if (result.error !== SETTINGS_CONCURRENCY_CONFLICT) return result;
  }
  return err(SETTINGS_CONCURRENCY_CONFLICT);
}

async function persistSettingsBulkWithOccRetry(
  qc: QueryClient,
  inputs: AppSettingsUpsertInput[],
): Promise<ServiceResult<AppSettingRow[]>> {
  const coreRows = inputs.map(({ module, key, value }) => ({ module, key, value }));
  for (let attempt = 0; attempt < APP_SETTINGS_OCC_MAX_ATTEMPTS; attempt += 1) {
    const rows = await fetchFreshSettingsRows(qc);
    const resolved = mergeAppSettingsUpsertWithVersions(coreRows, rows);
    const result = await persistSettingsRecord(qc, () => settingsEntry.bulkUpsertSettings(resolved));
    if (result.success) return result;
    if (result.error !== SETTINGS_CONCURRENCY_CONFLICT) return result;
  }
  return err<AppSettingRow[]>(SETTINGS_CONCURRENCY_CONFLICT);
}

export async function fetchCabAppSettingsPayload(): Promise<CabAppSettingsQueryPayload> {
  return dedupQuery(
    SETTINGS_PAYLOAD_QK,
    async () => {
      recordQueryFetch(SETTINGS_PAYLOAD_QK);
      const r = await settingsEntry.getAllSettings();
      if (!r.success) throw new Error(r.error ?? "Errore lettura impostazioni");
      const rows: AppSettingRow[] = r.data ?? [];
      return { rows, resolved: resolveCabAppSettingsFromRows(rows, null) };
    },
    { entityType: "settings", scope: "payload", consumerTag: "imperative" },
  );
}

export type CabAppSettingsQueryOptions = {
  enabled?: boolean;
  /** `static` = Infinity stale + no focus refetch; `default` = 30s (admin/editor). */
  tier?: "static" | "default";
  /** Solo AppSettingsQueryProvider — esegue fetch; altri consumer usano contesto condiviso. */
  owner?: boolean;
  staleTime?: number;
};

function resolveSettingsQueryPolicy(options?: CabAppSettingsQueryOptions, skipMountRefetch?: boolean) {
  if (options?.tier === "static") {
    const staticOpts = staticQueryOpts();
    if (skipMountRefetch) {
      return { ...staticOpts, refetchOnMount: false };
    }
    return staticOpts;
  }
  return {
    staleTime: options?.staleTime ?? 30_000,
    gcTime: 86_400_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    retry: 1,
  };
}

/** Impostazioni globali: righe DB + oggetto risolto (OCC su `rows[].updated_at`). */
export function useCabAppSettingsPayloadQuery(
  options?: CabAppSettingsQueryOptions,
): UseQueryResult<CabAppSettingsQueryPayload, Error> {
  const shared = useSharedAppSettingsQuery();
  const tier = options?.tier ?? "default";
  const isOwner = options?.owner === true;
  const wantShared = !isOwner && tier === "static" && shared != null && (options?.enabled ?? true);

  const enabled = (options?.enabled ?? true) && isSupabasePublicEnvConfigured() && !wantShared;
  const cachedPayload = getRuntimeCabAppSettingsPayload();
  const qc = useQueryClient();
  const dehydratedPayload = qc.getQueryData<CabAppSettingsQueryPayload>(SETTINGS_PAYLOAD_QK);
  const hasHydratedPayload = dehydratedPayload != null || cachedPayload != null;
  const policy = resolveSettingsQueryPolicy(options, wantShared || (tier === "static" && hasHydratedPayload));

  const q = useQuery({
    queryKey: SETTINGS_PAYLOAD_QK,
    queryFn: fetchCabAppSettingsPayload,
    enabled,
    ...policy,
    gcTime: policy.gcTime ?? 86_400_000,
    initialData: dehydratedPayload ?? cachedPayload ?? undefined,
    placeholderData: (previousData) => previousData ?? dehydratedPayload ?? cachedPayload ?? undefined,
  });

  useLayoutEffect(() => {
    if (!q.data?.resolved) return;
    const fp = computeSettingsPayloadFingerprint(q.data.rows);
    const cachedFp = getRuntimeSettingsFingerprint();
    if (cachedFp && cachedFp === fp && cachedPayload?.resolved) {
      return;
    }
    setRuntimeCabAppSettings(q.data.resolved);
    setRuntimeCabAppSettingsPayload(q.data);
  }, [q.data, cachedPayload?.resolved]);

  if (wantShared && shared) {
    return shared;
  }
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
    (rows: AppSettingsUpsertInput[]) => persistSettingsBulkWithOccRetry(qc, rows),
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
    (input: AppSettingsUpsertInput) => persistSettingsUpsertWithOccRetry(qc, input),
    {
      onError: (e) => {
        onConflict(e.message);
      },
    },
  );
}

export { mergeAppSettingsUpsertWithVersions, persistSettingsRecord, SETTINGS_CONCURRENCY_CONFLICT };
