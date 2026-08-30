"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { todayDateYmd } from "@/lib/dipendenti/timesheet-month";
import {
  monthKeyFromParts,
  parseMonthKey,
  type DashboardPromemoriaDeleteInput,
  type DashboardPromemoriaMonthKey,
  type DashboardPromemoriaRow,
} from "@/lib/dashboard/dashboard-promemoria-types";
import type { PromemoriaRecurrenceScope } from "@/lib/dashboard/dashboard-promemoria-recurrence";
import {
  cabSyncEventForEntity,
  dispatchGestionaleLocalMutation,
} from "@/lib/sync/gestionale-sync-dispatch";
import {
  markRecentLocalGestionaleMutation,
  shouldSuppressRemoteCacheInvalidation,
} from "@/lib/sync/recent-local-mutation";
import { useCabSyncListener } from "@/src/hooks/use-cab-sync-listener";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { dashboardPromemoriaEntry } from "@/lib/domain/dashboard-promemoria-entry";

export const DASHBOARD_PROMEMORIA_QUERY_KEY = ["dashboard-promemoria"] as const;

export function dashboardPromemoriaMonthQueryKey(monthKey: DashboardPromemoriaMonthKey) {
  return [...DASHBOARD_PROMEMORIA_QUERY_KEY, "month", monthKey] as const;
}

export function dashboardPromemoriaDateQueryKey(ymd: string) {
  return [...DASHBOARD_PROMEMORIA_QUERY_KEY, "date", ymd] as const;
}

export function groupPromemoriaByDate(rows: readonly DashboardPromemoriaRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    out[row.event_date] = (out[row.event_date] ?? 0) + 1;
  }
  return out;
}

type PromemoriaDeleteOptimisticContext = {
  snapshots: Array<[queryKey: readonly unknown[], data: DashboardPromemoriaRow[] | undefined]>;
};

async function fetchPromemoriaMonth(monthKey: DashboardPromemoriaMonthKey): Promise<DashboardPromemoriaRow[]> {
  const res = await dashboardPromemoriaEntry.listByMonth(monthKey);
  if (!res.success) throw new Error(res.error ?? "Caricamento promemoria fallito");
  return res.data ?? [];
}

export function useDashboardPromemoria(monthKey: DashboardPromemoriaMonthKey) {
  const queryClient = useQueryClient();
  const monthQuery = useQuery({
    queryKey: dashboardPromemoriaMonthQueryKey(monthKey),
    queryFn: () => fetchPromemoriaMonth(monthKey),
  });

  useCabSyncListener("dashboard_promemoria", (ev) => {
    if (ev.type !== "entity_created" && ev.type !== "entity_updated" && ev.type !== "entity_deleted") return;
    if (shouldSuppressRemoteCacheInvalidation("dashboard_promemoria", ev.id)) return;
    void monthQuery.refetch();
  });

  const countsByDate = useMemo(
    () => groupPromemoriaByDate(monthQuery.data ?? []),
    [monthQuery.data],
  );

  const invalidateKeys = [DASHBOARD_PROMEMORIA_QUERY_KEY] as const;

  const createMutation = useServiceMutation(
    (input: Parameters<typeof dashboardPromemoriaEntry.create>[0]) => dashboardPromemoriaEntry.create(input),
    { invalidateQueryKeys: [invalidateKeys] },
  );

  const updateMutation = useServiceMutation(
    (input: Parameters<typeof dashboardPromemoriaEntry.update>[0]) => dashboardPromemoriaEntry.update(input),
    { invalidateQueryKeys: [invalidateKeys] },
  );

  const deleteMutation = useServiceMutation(
    (input: DashboardPromemoriaDeleteInput) => dashboardPromemoriaEntry.softDelete(input),
    {
      onMutate: async (input) => {
        const id = input.id;
        const scope: PromemoriaRecurrenceScope =
          input.scope === "following" || input.scope === "series" ? input.scope : "single";
        await queryClient.cancelQueries({ queryKey: DASHBOARD_PROMEMORIA_QUERY_KEY });
        const snapshots = queryClient.getQueriesData<DashboardPromemoriaRow[]>({
          queryKey: DASHBOARD_PROMEMORIA_QUERY_KEY,
        });
        const anchor = snapshots
          .flatMap(([, rows]) => rows ?? [])
          .find((r) => r.id === id);
        queryClient.setQueriesData<DashboardPromemoriaRow[]>(
          { queryKey: DASHBOARD_PROMEMORIA_QUERY_KEY },
          (prev) =>
            (prev ?? []).filter((r) => {
              if (r.id === id) return false;
              if (!anchor?.series_id || scope === "single") return true;
              if (r.series_id !== anchor.series_id) return true;
              if (scope === "series") return false;
              return r.event_date < anchor.event_date;
            }),
        );
        return { snapshots } satisfies PromemoriaDeleteOptimisticContext;
      },
      onSuccess: (_data, input) => {
        markRecentLocalGestionaleMutation(["dashboard_promemoria"], input.id);
      },
      onError: (_err, _input, context) => {
        const ctx = context as PromemoriaDeleteOptimisticContext | undefined;
        if (!ctx?.snapshots) return;
        for (const [key, data] of ctx.snapshots) {
          queryClient.setQueryData(key, data);
        }
      },
      onSettled: (_data, error, input) => {
        if (error || !input?.id) return;
        dispatchGestionaleLocalMutation(queryClient, ["dashboard_promemoria"], [
          cabSyncEventForEntity("dashboard_promemoria", input.id, "entity_deleted", "dashboard_promemoria"),
        ]);
      },
      invalidateQueryKeys: [invalidateKeys],
    },
  );

  return {
    rows: monthQuery.data ?? [],
    countsByDate,
    isLoading: monthQuery.isLoading,
    isFetching: monthQuery.isFetching,
    isError: monthQuery.isError,
    error: monthQuery.error,
    refetch: monthQuery.refetch,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}

export function useDashboardPromemoriaDay(selectedYmd: string, monthKey: DashboardPromemoriaMonthKey) {
  const {
    rows,
    countsByDate,
    isLoading,
    isFetching,
    isError,
    error,
    createMutation,
    updateMutation,
    deleteMutation,
    refetch,
  } = useDashboardPromemoria(monthKey);

  const dayRows = useMemo(
    () => rows.filter((r) => r.event_date === selectedYmd),
    [rows, selectedYmd],
  );

  return {
    dayRows,
    countsByDate,
    isLoading,
    isFetching,
    isError,
    error,
    createMutation,
    updateMutation,
    deleteMutation,
    refetch,
  };
}

export function initialPromemoriaMonthKey(): DashboardPromemoriaMonthKey {
  const today = todayDateYmd();
  const [y, m] = today.split("-");
  return monthKeyFromParts(Number(y), Number(m));
}

export function promemoriaMonthKeyFromYmd(ymd: string): DashboardPromemoriaMonthKey {
  const [y, m] = ymd.split("-");
  return monthKeyFromParts(Number(y), Number(m));
}

export function shiftPromemoriaMonthKey(key: DashboardPromemoriaMonthKey, delta: number): DashboardPromemoriaMonthKey {
  const { year, month } = parseMonthKey(key);
  const d = new Date(year, month - 1 + delta, 1);
  return monthKeyFromParts(d.getFullYear(), d.getMonth() + 1);
}

/** Prefetch mese adiacente (nav calendario più fluida). */
export function prefetchPromemoriaMonth(queryClient: QueryClient, monthKey: DashboardPromemoriaMonthKey): void {
  void queryClient.prefetchQuery({
    queryKey: dashboardPromemoriaMonthQueryKey(monthKey),
    queryFn: () => fetchPromemoriaMonth(monthKey),
    staleTime: 30_000,
  });
}
