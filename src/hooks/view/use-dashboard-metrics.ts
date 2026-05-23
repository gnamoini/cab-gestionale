"use client";

import { useMemo } from "react";
import { isStagingPublicSlice } from "@/lib/env/staging-public";
import {
  computeDashboardLavWidgetRows,
  computeDashboardMagDailyMovements,
  computeDashboardMagRecentMovements,
  computeDashboardMagRecentRicambi,
  computeDashboardMagWidgetStats,
} from "@/lib/view/dashboard-widgets-selectors";
import { useViewQueryOpts } from "@/lib/view/view-query-opts";
import {
  useMagazzinoRicambiUIQuery,
  useMovimentiListQuery,
} from "@/src/hooks/gestionale/use-entity-list-queries";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";

const LAV_FILTERS = { includeMezzo: true as const, archived: false as const };

/** Query + selector aggregati per widget Lavorazioni/Magazzino dashboard (VIEW layer, read-only). */
export function useDashboardMetrics() {
  const staging = isStagingPublicSlice();
  const viewOpts = useViewQueryOpts();

  const lavQuery = useLavorazioniList(LAV_FILTERS, viewOpts);
  const magQuery = useMagazzinoRicambiUIQuery(undefined, viewOpts);
  const movQuery = useMovimentiListQuery(undefined, viewOpts);

  const lavRows = useMemo(() => computeDashboardLavWidgetRows(lavQuery.data ?? []), [lavQuery.data]);

  const ricambiById = useMemo(() => {
    const map = new Map<string, (typeof magQuery.data)[number]>();
    for (const r of magQuery.data ?? []) map.set(r.id, r);
    return map;
  }, [magQuery.data]);

  const magStats = useMemo(
    () => (staging ? { capitale: 0, sottoScorta: 0 } : computeDashboardMagWidgetStats(magQuery.data ?? [])),
    [magQuery.data, staging],
  );

  const magRecentRicambi = useMemo(
    () => (staging ? [] : computeDashboardMagRecentRicambi(magQuery.data ?? [])),
    [magQuery.data, staging],
  );

  const magDailyMovements = useMemo(
    () => (staging ? { entrate: 0, uscite: 0 } : computeDashboardMagDailyMovements(movQuery.data ?? [])),
    [movQuery.data, staging],
  );

  const magRecentMovements = useMemo(
    () => (staging ? [] : computeDashboardMagRecentMovements(movQuery.data ?? [], ricambiById)),
    [movQuery.data, ricambiById, staging],
  );

  const isLoading = lavQuery.isLoading || magQuery.isLoading || movQuery.isLoading;
  const isError = lavQuery.isError || magQuery.isError || movQuery.isError;

  return {
    staging,
    lavQuery,
    magQuery,
    movQuery,
    lavRows,
    magStats,
    magRecentRicambi,
    magDailyMovements,
    magRecentMovements,
    lavLoading: lavQuery.isLoading,
    lavError: lavQuery.isError,
    magLoading: magQuery.isLoading || movQuery.isLoading,
    magError: magQuery.isError || movQuery.isError,
    isLoading,
    isError,
  };
}
