"use client";

import { useMemo } from "react";
import { isStagingPublicSlice } from "@/lib/env/staging-public";
import {
  computeDashboardLavPreview,
  computeDashboardMagStatsFromRows,
} from "@/lib/view/view-aggregation-cache";
import { useViewQueryOpts } from "@/lib/view/view-query-opts";
import { useMagazzinoListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";

const LAV_FILTERS = { includeMezzo: true as const, archived: false as const };

/** Query + selector aggregati per KPI dashboard operativa (read-only VIEW layer). */
export function useDashboardMetrics() {
  const staging = isStagingPublicSlice();
  const viewOpts = useViewQueryOpts();

  const lavQuery = useLavorazioniList(LAV_FILTERS, viewOpts);
  const magQuery = useMagazzinoListQuery(undefined, viewOpts);

  const lavCount = lavQuery.data?.length ?? 0;
  const preview = useMemo(() => computeDashboardLavPreview(lavQuery.data ?? []), [lavQuery.data]);
  const magStats = useMemo(
    () => computeDashboardMagStatsFromRows(magQuery.data ?? [], staging),
    [magQuery.data, staging],
  );

  const isLoading = lavQuery.isLoading || magQuery.isLoading;
  const isError = lavQuery.isError || magQuery.isError;

  return {
    lavQuery,
    magQuery,
    lavCount,
    preview,
    magStats,
    isLoading,
    isError,
  };
}
