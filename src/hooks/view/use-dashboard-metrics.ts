"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isStagingPublicSlice } from "@/lib/env/staging-public";
import { computeDashboardMagFeedFromLogs } from "@/lib/view/dashboard-magazzino-log-selectors";
import {
  computeDashboardLavWidgetRows,
  computeDashboardLavWidgetStats,
  computeDashboardMagDailyMovements,
  computeDashboardMagSottoScortaRicambi,
  computeDashboardMagWidgetStats,
} from "@/lib/view/dashboard-widgets-selectors";
import { useViewQueryOpts } from "@/lib/view/view-query-opts";
import {
  useLogListQuery,
  useMagazzinoRicambiUIQuery,
  useMovimentiListQuery,
} from "@/src/hooks/gestionale/use-entity-list-queries";
import { useCabSyncListener } from "@/src/hooks/use-cab-sync-listener";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";

const LAV_FILTERS = { includeMezzo: true as const, archived: false as const };
const MAG_LOG_SCAN_LIMIT = 80;

/** Query + selector aggregati per widget Lavorazioni/Magazzino dashboard (VIEW layer, read-only). */
export function useDashboardMetrics() {
  const staging = isStagingPublicSlice();
  const viewOpts = useViewQueryOpts();
  const qc = useQueryClient();

  const invalidateMagLogs = () => {
    void qc.invalidateQueries({ queryKey: QK.log, refetchType: "active" });
  };

  useCabSyncListener("log_modifiche", invalidateMagLogs);
  useCabSyncListener("magazzino_ricambi", invalidateMagLogs);
  useCabSyncListener("movimenti_ricambi", invalidateMagLogs);

  const globalOpts = useGlobalOptions({ debugTag: "useDashboardMetrics" });
  const { store: schedeStore } = useSchedeBundlesQuery(!staging);

  const lavQuery = useLavorazioniList(LAV_FILTERS, viewOpts);
  const magQuery = useMagazzinoRicambiUIQuery(undefined, viewOpts);
  const movQuery = useMovimentiListQuery(undefined, viewOpts);
  const magLogsQ = useLogListQuery(
    { entita: "magazzino_ricambi", limit: MAG_LOG_SCAN_LIMIT },
    { enabled: !staging, ...viewOpts },
  );
  const movLogsQ = useLogListQuery(
    { entita: "movimenti_ricambi", limit: MAG_LOG_SCAN_LIMIT },
    { enabled: !staging, ...viewOpts },
  );

  const defaultAddetto = globalOpts.lavorazioni.addetti[0] ?? "";
  const lavRows = useMemo(
    () =>
      computeDashboardLavWidgetRows(lavQuery.data ?? [], undefined, {
        schedeStore,
        defaultAddetto,
      }),
    [defaultAddetto, lavQuery.data, schedeStore],
  );
  const lavStats = useMemo(() => computeDashboardLavWidgetStats(lavQuery.data ?? []), [lavQuery.data]);

  const ricambiById = useMemo(() => {
    const map = new Map<string, (typeof magQuery.data)[number]>();
    for (const r of magQuery.data ?? []) map.set(r.id, r);
    return map;
  }, [magQuery.data]);

  const magStats = useMemo(
    () => (staging ? { capitale: 0, sottoScorta: 0 } : computeDashboardMagWidgetStats(magQuery.data ?? [])),
    [magQuery.data, staging],
  );

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

  const magRecentRicambi = magLogFeed.modified;
  const magRecentMovements = magLogFeed.movements;

  const magDailyMovements = useMemo(
    () => (staging ? { entrate: 0, uscite: 0 } : computeDashboardMagDailyMovements(movQuery.data ?? [])),
    [movQuery.data, staging],
  );

  const isLoading =
    lavQuery.isLoading || magQuery.isLoading || movQuery.isLoading || magLogsQ.isLoading || movLogsQ.isLoading;
  const isError =
    lavQuery.isError || magQuery.isError || movQuery.isError || magLogsQ.isError || movLogsQ.isError;

  return {
    staging,
    lavQuery,
    magQuery,
    movQuery,
    lavRows,
    lavStats,
    magStats,
    magSottoScortaRicambi,
    magRecentRicambi,
    magDailyMovements,
    magRecentMovements,
    lavLoading: lavQuery.isLoading,
    lavError: lavQuery.isError,
    magLoading: magQuery.isLoading || movQuery.isLoading || magLogsQ.isLoading || movLogsQ.isLoading,
    magError: magQuery.isError || movQuery.isError || magLogsQ.isError || movLogsQ.isError,
    isLoading,
    isError,
  };
}
