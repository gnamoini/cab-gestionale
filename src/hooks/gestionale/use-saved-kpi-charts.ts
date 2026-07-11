"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  canAutoImportLocal,
  localChartsToCreateInputs,
  markLocalMigrationDone,
  readLocalKpiCharts,
  shouldMigrateLocal,
} from "@/lib/report/kpi-chart-config/migration";
import type { CreateSavedKpiChartInput, SavedKpiChart } from "@/lib/report/kpi-chart-config/contracts";
import { savedKpiChartToConfigBody } from "@/lib/report/kpi-chart-config/mapper";
import { KPI_CHART_CONFIG_SCHEMA_VERSION } from "@/lib/report/kpi-chart-config/contracts";
import { reportKpiChartMigrated } from "@/lib/report/report-kpi-chart-telemetry";
import { isAuthSessionEstablished, type AuthStatus } from "@/src/lib/auth/auth-status";
import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";
import { QK } from "@/src/lib/react-query/query-keys";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { reportSavedKpiChartsEntry } from "@/lib/domain/report-saved-kpi-charts-entry";
import { err } from "@/src/services/service-result";

export function savedKpiChartsQueryKey(userId: string) {
  return [...QK.reportSavedKpiCharts, userId] as const;
}

async function fetchSavedKpiCharts(): Promise<SavedKpiChart[]> {
  const res = await reportSavedKpiChartsEntry.list();
  if (!res.success) throw new Error(res.error ?? "Impossibile caricare i grafici salvati");
  return res.data ?? [];
}

export function useSavedKpiChartsQuery(userId: string | null | undefined, authStatus: AuthStatus) {
  const enabled =
    isSupabasePublicEnvConfigured() && isAuthSessionEstablished(authStatus) && !!userId;
  return useQuery({
    queryKey: userId ? savedKpiChartsQueryKey(userId) : ([...QK.reportSavedKpiCharts, "none"] as const),
    queryFn: fetchSavedKpiCharts,
    enabled,
    staleTime: 30_000,
  });
}

export function useCreateSavedKpiChartMutation(userId: string | null | undefined) {
  const qc = useQueryClient();
  return useServiceMutation(
    (input: Omit<CreateSavedKpiChartInput, "id"> & { id?: string }) => {
      if (!userId) return Promise.resolve(err("Utente non autenticato."));
      return reportSavedKpiChartsEntry.create(userId, input);
    },
    {
      onSuccess: (chart) => {
        if (!userId || !chart) return;
        qc.setQueryData<SavedKpiChart[]>(savedKpiChartsQueryKey(userId), (prev) => [
          chart,
          ...(prev ?? []).filter((c) => c.id !== chart.id),
        ]);
      },
      invalidateQueryKeys: userId ? [[...QK.reportSavedKpiCharts, userId]] : undefined,
    },
  );
}

export function useUpdateSavedKpiChartMutation(userId: string | null | undefined) {
  const qc = useQueryClient();
  return useServiceMutation(
    (input: { id: string; name?: string; chart: Pick<SavedKpiChart, "metricIds" | "preset" | "customFrom" | "customTo" | "displayMode" | "normalization"> }) =>
      reportSavedKpiChartsEntry.update({
        id: input.id,
        name: input.name,
        config: savedKpiChartToConfigBody(input.chart),
      }),
    {
      onSuccess: (chart) => {
        if (!userId || !chart) return;
        qc.setQueryData<SavedKpiChart[]>(savedKpiChartsQueryKey(userId), (prev) =>
          (prev ?? []).map((c) => (c.id === chart.id ? chart : c)),
        );
      },
    },
  );
}

export function useDeleteSavedKpiChartMutation(userId: string | null | undefined) {
  const qc = useQueryClient();
  return useServiceMutation((id: string) => reportSavedKpiChartsEntry.delete(id), {
    onSuccess: (_void, id) => {
      if (!userId) return;
      qc.setQueryData<SavedKpiChart[]>(savedKpiChartsQueryKey(userId), (prev) =>
        (prev ?? []).filter((c) => c.id !== id),
      );
    },
  });
}

export function useMigrateLocalKpiCharts(userId: string | null | undefined, dbCharts: SavedKpiChart[] | undefined) {
  const ranRef = useRef(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId || dbCharts === undefined || ranRef.current) return;
    if (!shouldMigrateLocal(userId)) return;

    ranRef.current = true;
    const localCharts = readLocalKpiCharts(userId);

    void (async () => {
      if (dbCharts.length > 0) {
        markLocalMigrationDone(userId);
        if (localCharts.length > 0) {
          reportKpiChartMigrated({
            importedCount: 0,
            skippedCount: localCharts.length,
            schemaVersion: KPI_CHART_CONFIG_SCHEMA_VERSION,
          });
        }
        return;
      }

      if (!canAutoImportLocal(dbCharts.length, localCharts)) {
        if (localCharts.length === 0) markLocalMigrationDone(userId);
        return;
      }

      const res = await reportSavedKpiChartsEntry.bulkCreate(
        userId,
        localChartsToCreateInputs(localCharts),
      );
      markLocalMigrationDone(userId);

      if (res.success && res.data) {
        qc.setQueryData(savedKpiChartsQueryKey(userId), res.data);
        reportKpiChartMigrated({
          importedCount: res.data.length,
          skippedCount: localCharts.length - res.data.length,
          schemaVersion: KPI_CHART_CONFIG_SCHEMA_VERSION,
        });
      } else {
        reportKpiChartMigrated({
          importedCount: 0,
          skippedCount: localCharts.length,
          schemaVersion: KPI_CHART_CONFIG_SCHEMA_VERSION,
        });
      }
    })();
  }, [userId, dbCharts, qc]);
}
