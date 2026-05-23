"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildReportLavorazioniBundle } from "@/lib/report/lavorazioni-report-selectors";
import { loadMagazzinoChangeLog, MAGAZZINO_CHANGE_LOG_STORAGE_KEY } from "@/lib/magazzino/magazzino-change-log-storage";
import { magazzinoRowToRicambioUI } from "@/lib/magazzino/magazzino-db-ui-adapter";
import { manualEntriesToByMonth } from "@/lib/report/report-manual-entries-map";
import { toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { subscribeReportDataRefresh } from "@/lib/report/report-broadcast";
import { useViewQueryOpts } from "@/lib/view/view-query-opts";
import { useMagazzinoListQuery, useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useReportManualEntriesQuery } from "@/src/hooks/view/use-report-manual-entries";
import { QK } from "@/src/lib/react-query/query-keys";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";

/** Tutte le lavorazioni non eliminate (in corso + archiviate); split report su `archived`. */
const LAV_LIST_FILTERS = { includeMezzo: true as const };

export function useReportLiveData() {
  const queryClient = useQueryClient();
  const viewOpts = useViewQueryOpts({ staleTime: 0 });
  const [magLogVersion, setMagLogVersion] = useState(0);

  const bumpMagLog = useCallback(() => setMagLogVersion((v) => v + 1), []);

  const refetchReportQueries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: QK.lavorazioniQueries, refetchType: "active" });
    void queryClient.invalidateQueries({ queryKey: QK.magazzino, refetchType: "active" });
    void queryClient.invalidateQueries({ queryKey: QK.movimenti, refetchType: "active" });
    void queryClient.invalidateQueries({ queryKey: QK.mezzi, refetchType: "active" });
    void queryClient.invalidateQueries({ queryKey: QK.reportManualEntries, refetchType: "active" });
    bumpMagLog();
  }, [queryClient, bumpMagLog]);

  const lavQuery = useLavorazioniList(LAV_LIST_FILTERS, viewOpts);
  const magQuery = useMagazzinoListQuery(undefined, viewOpts);
  const mezziQuery = useMezziListQuery(undefined, viewOpts);
  const manualQuery = useReportManualEntriesQuery();

  useEffect(() => {
    const unsub = subscribeReportDataRefresh(refetchReportQueries);
    const onStorage = (e: StorageEvent) => {
      if (e.key === MAGAZZINO_CHANGE_LOG_STORAGE_KEY) refetchReportQueries();
    };
    let visTimer: ReturnType<typeof setTimeout> | null = null;
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (visTimer) clearTimeout(visTimer);
      visTimer = setTimeout(() => refetchReportQueries(), 800);
    };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      unsub();
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVis);
      if (visTimer) clearTimeout(visTimer);
    };
  }, [refetchReportQueries]);

  const bundle = useMemo(
    () => buildReportLavorazioniBundle(lavQuery.data ?? []),
    [lavQuery.data],
  );

  const manualEntries = manualQuery.data ?? [];
  const manualByMonth = useMemo(() => manualEntriesToByMonth(manualEntries), [manualEntries]);

  const mapped = useMemo(() => {
    const magazzino = (magQuery.data ?? []).map((row) => magazzinoRowToRicambioUI(row));
    const mezzi = (mezziQuery.data ?? []).map(toMezzoUI);
    return { ...bundle, magazzino, mezzi };
  }, [bundle, magQuery.data, mezziQuery.data]);

  const magLog = useMemo(() => {
    void magLogVersion;
    return loadMagazzinoChangeLog();
  }, [magLogVersion]);

  return useMemo(
    () => ({
      ...mapped,
      manualEntries,
      manualByMonth,
      magLog,
      isLoading:
        lavQuery.isLoading || magQuery.isLoading || mezziQuery.isLoading || manualQuery.isLoading,
      isError: lavQuery.isError || magQuery.isError || mezziQuery.isError || manualQuery.isError,
      manualLoading: manualQuery.isLoading,
      manualError: manualQuery.isError,
    }),
    [
      mapped,
      manualEntries,
      manualByMonth,
      magLog,
      lavQuery.isLoading,
      magQuery.isLoading,
      mezziQuery.isLoading,
      manualQuery.isLoading,
      lavQuery.isError,
      magQuery.isError,
      mezziQuery.isError,
      manualQuery.isError,
    ],
  );
}
