"use client";

import { useLayoutEffect } from "react";
import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
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

export type CabAppSettingsQueryPayload = {
  rows: AppSettingRow[];
  resolved: CabAppSettingsResolved;
};

const SETTINGS_PAYLOAD_QK = [...QK.settings, "payload"] as const;

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
    (rows: AppSettingsUpsertInput[]) => persistSettingsRecord(qc, () => settingsEntry.bulkUpsertSettings(rows)),
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
    (input: AppSettingsUpsertInput) => persistSettingsRecord(qc, () => settingsEntry.upsertSetting(input)),
    {
      onError: (e) => {
        onConflict(e.message);
      },
    },
  );
}

export { mergeAppSettingsUpsertWithVersions, persistSettingsRecord, SETTINGS_CONCURRENCY_CONFLICT };
