"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import { useQuery } from "@tanstack/react-query";
import { isStagingPublicSlice } from "@/lib/env/staging-public";
import {
  computeDashboardMagDailyMovementsFromLogs,
  computeDashboardMagFeedFromLogs,
} from "@/lib/view/dashboard-magazzino-log-selectors";
import {
  computeDashboardLavWidgetRows,
  computeDashboardLavWidgetStats,
  computeDashboardMagSottoScortaRicambi,
  pickDashboardPriorityLavorazioneIds,
  DASHBOARD_SCHEde_PREFETCH_LIMIT,
} from "@/lib/view/dashboard-widgets-selectors";
import { computeReportMagazzinoKpiWidgetFromUi } from "@/lib/report/report-kpi-selectors";
import { GESTIONALE_LOG_FEED_LIMIT } from "@/lib/react-query/query-layer-policies";
import { useViewQueryOpts } from "@/lib/view/view-query-opts";
import { useLogListQuery, useMagazzinoRicambiUIQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";
import { isLavorazioneInCorso } from "@/lib/lavorazioni/archived";
import { useLavorazioniReportSlice } from "@/lib/lavorazioni/use-lavorazioni-report-slice";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import { MAGAZZINO_DASHBOARD_KPI_QUERY_KEY } from "@/lib/magazzino/dashboard-mag-query-keys";

/** Query + selector aggregati per widget Lavorazioni/Magazzino dashboard (VIEW layer, read-only). */
export function useDashboardMetrics() {
  const staging = isStagingPublicSlice();
  const viewOpts = useViewQueryOpts();
  const loadStartRef = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const loadLoggedRef = useRef(false);
  const globalOpts = useGlobalOptions({ debugTag: "useDashboardMetrics" });

  // ponytail: report slice (attive + archivio) — KPI brief settimanale; widget filtra in corso lato selector.
  const lavQuery = useLavorazioniReportSlice({
    enabled: !staging,
    staleTime: viewOpts.staleTime,
  });
  const lavActiveRows = useMemo(
    () => (lavQuery.data ?? []).filter((r) => !r.deleted_at && isLavorazioneInCorso(r)),
    [lavQuery.data],
  );
  const schedeLavorazioneIds = useMemo(
    () => pickDashboardPriorityLavorazioneIds(lavActiveRows, DASHBOARD_SCHEde_PREFETCH_LIMIT),
    [lavActiveRows],
  );
  const { store: schedeStore } = useSchedeBundlesQuery(!staging, {
    lavorazioneIds: schedeLavorazioneIds,
  });
  const magQuery = useMagazzinoRicambiUIQuery(undefined, { ...viewOpts, variant: "report" });
  const magKpiHydrated = useQuery({
    queryKey: MAGAZZINO_DASHBOARD_KPI_QUERY_KEY,
    queryFn: () => ({ sottoScorta: 0, capitale: 0 }),
    enabled: false,
  });
  const magLogsQ = useLogListQuery(
    { entita: "magazzino_ricambi", limit: GESTIONALE_LOG_FEED_LIMIT },
    { enabled: !staging, ...viewOpts },
  );
  const movLogsQ = useLogListQuery(
    { entita: "movimenti_ricambi", limit: GESTIONALE_LOG_FEED_LIMIT },
    { enabled: !staging, ...viewOpts },
  );

  const lavRows = useMemo(
    () =>
      computeDashboardLavWidgetRows(lavActiveRows, undefined, {
        schedeStore,
      }),
    [lavActiveRows, schedeStore],
  );
  const lavStats = useMemo(() => computeDashboardLavWidgetStats(lavActiveRows), [lavActiveRows]);

  const ricambiById = useMemo(() => {
    const map = new Map<string, (typeof magQuery.data)[number]>();
    for (const r of magQuery.data ?? []) map.set(r.id, r);
    return map;
  }, [magQuery.data]);

  const magStats = useMemo(() => {
    if (staging) return { capitale: 0, sottoScorta: 0 };
    if (magKpiHydrated.data) return magKpiHydrated.data;
    return computeReportMagazzinoKpiWidgetFromUi(magQuery.data ?? []);
  }, [magKpiHydrated.data, magQuery.data, staging]);

  const magSottoScortaRicambi = useMemo(
    () => (staging ? [] : computeDashboardMagSottoScortaRicambi(magQuery.data ?? [])),
    [magQuery.data, staging],
  );

  const magLogFeed = useMemo(() => {
    if (staging) return { movements: [], modified: [] };
    return computeDashboardMagFeedFromLogs(magLogsQ.data ?? [], movLogsQ.data ?? [], ricambiById, {
      movementLimit: 3,
      modifiedLimit: 3,
    });
  }, [magLogsQ.data, movLogsQ.data, ricambiById, staging]);

  const magRecentMovements = magLogFeed.movements;

  const magDailyMovements = useMemo(
    () =>
      staging
        ? { entrate: 0, uscite: 0 }
        : computeDashboardMagDailyMovementsFromLogs(
            magLogsQ.data ?? [],
            movLogsQ.data ?? [],
            ricambiById,
          ),
    [magLogsQ.data, movLogsQ.data, ricambiById, staging],
  );

  const isLoading = lavQuery.isLoading || magQuery.isLoading || magLogsQ.isLoading || movLogsQ.isLoading;
  const isError = lavQuery.isError || magQuery.isError || magLogsQ.isError || movLogsQ.isError;

  useEffect(() => {
    if (staging || loadLoggedRef.current) return;
    if (isLoading) return;
    if (isError) return;
    loadLoggedRef.current = true;
    const durationMs = Math.round(performance.now() - loadStartRef.current);
    trackRuntimeEvent(RuntimeEvents.dashboardLoadDuration, { durationMs });
  }, [staging, isLoading, isError]);

  const magLogs = (magLogsQ.data ?? []) as readonly LogModificaRow[];
  const movLogs = (movLogsQ.data ?? []) as readonly LogModificaRow[];

  return {
    staging,
    globalOpts,
    lavQuery,
    magQuery,
    magLogs,
    movLogs,
    lavActiveRows,
    lavRows,
    lavStats,
    magStats,
    magSottoScortaRicambi,
    magDailyMovements,
    magRecentMovements,
    lavLoading: lavQuery.isLoading,
    lavError: lavQuery.isError,
    magLoading: magQuery.isLoading || magLogsQ.isLoading || movLogsQ.isLoading,
    magError: magQuery.isError || magLogsQ.isError || movLogsQ.isError,
    isLoading,
    isError,
  };
}
