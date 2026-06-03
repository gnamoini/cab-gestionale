"use client";

import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { todayDateYmd } from "@/lib/dipendenti/timesheet-month";
import {
  monthKeyFromParts,
  parseMonthKey,
  type DashboardPromemoriaMonthKey,
  type DashboardPromemoriaRow,
} from "@/lib/dashboard/dashboard-promemoria-types";
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
import { dashboardPromemoriaService } from "@/src/services/dashboard-promemoria.service";

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
  // #region agent log
  fetch('http://127.0.0.1:7662/ingest/191e4801-c810-4957-b192-301c6ab4b769',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b1d6c0'},body:JSON.stringify({sessionId:'b1d6c0',hypothesisId:'A',location:'use-dashboard-promemoria.ts:fetchPromemoriaMonth:start',message:'fetch start',data:{monthKey},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const res = await dashboardPromemoriaService.listByMonth(monthKey);
  // #region agent log
  fetch('http://127.0.0.1:7662/ingest/191e4801-c810-4957-b192-301c6ab4b769',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b1d6c0'},body:JSON.stringify({sessionId:'b1d6c0',hypothesisId:'A',location:'use-dashboard-promemoria.ts:fetchPromemoriaMonth:end',message:'fetch end',data:{monthKey,success:res.success,rowCount:res.data?.length??0,error:res.success?null:res.error},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
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
    if (ev.type === "settings_updated") return;
    if (shouldSuppressRemoteCacheInvalidation("dashboard_promemoria", ev.id)) return;
    // #region agent log
    fetch('http://127.0.0.1:7662/ingest/191e4801-c810-4957-b192-301c6ab4b769',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b1d6c0'},body:JSON.stringify({sessionId:'b1d6c0',hypothesisId:'B',location:'use-dashboard-promemoria.ts:cabSync',message:'cab sync refetch',data:{monthKey,evType:ev.type,evId:ev.id,isFetching:monthQuery.isFetching},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    void monthQuery.refetch();
  });

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7662/ingest/191e4801-c810-4957-b192-301c6ab4b769',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b1d6c0'},body:JSON.stringify({sessionId:'b1d6c0',hypothesisId:'C',location:'use-dashboard-promemoria.ts:queryStatus',message:'query status',data:{monthKey,status:monthQuery.status,fetchStatus:monthQuery.fetchStatus,isLoading:monthQuery.isLoading,isFetching:monthQuery.isFetching,isError:monthQuery.isError,rowCount:monthQuery.data?.length??null},timestamp:Date.now()})}).catch(()=>{});
  }, [monthKey, monthQuery.status, monthQuery.fetchStatus, monthQuery.isLoading, monthQuery.isFetching, monthQuery.isError, monthQuery.data]);
  // #endregion

  const countsByDate = useMemo(
    () => groupPromemoriaByDate(monthQuery.data ?? []),
    [monthQuery.data],
  );

  const invalidateKeys = [DASHBOARD_PROMEMORIA_QUERY_KEY] as const;

  const createMutation = useServiceMutation(
    (input: Parameters<typeof dashboardPromemoriaService.create>[0]) => dashboardPromemoriaService.create(input),
    { invalidateQueryKeys: [invalidateKeys] },
  );

  const updateMutation = useServiceMutation(
    (input: Parameters<typeof dashboardPromemoriaService.update>[0]) => dashboardPromemoriaService.update(input),
    { invalidateQueryKeys: [invalidateKeys] },
  );

  const deleteMutation = useServiceMutation(
    (id: string) => dashboardPromemoriaService.softDelete(id),
    {
      onMutate: async (id) => {
        await queryClient.cancelQueries({ queryKey: DASHBOARD_PROMEMORIA_QUERY_KEY });
        const snapshots = queryClient.getQueriesData<DashboardPromemoriaRow[]>({
          queryKey: DASHBOARD_PROMEMORIA_QUERY_KEY,
        });
        queryClient.setQueriesData<DashboardPromemoriaRow[]>(
          { queryKey: DASHBOARD_PROMEMORIA_QUERY_KEY },
          (prev) => (prev ?? []).filter((r) => r.id !== id),
        );
        return { snapshots } satisfies PromemoriaDeleteOptimisticContext;
      },
      onSuccess: (_data, id) => {
        markRecentLocalGestionaleMutation(["dashboard_promemoria"], id);
      },
      onError: (_err, _id, context) => {
        const ctx = context as PromemoriaDeleteOptimisticContext | undefined;
        if (!ctx?.snapshots) return;
        for (const [key, data] of ctx.snapshots) {
          queryClient.setQueryData(key, data);
        }
      },
      onSettled: (_data, error, id) => {
        if (error || !id) return;
        dispatchGestionaleLocalMutation(queryClient, ["dashboard_promemoria"], [
          cabSyncEventForEntity("dashboard_promemoria", id, "entity_deleted", "dashboard_promemoria"),
        ]);
      },
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
