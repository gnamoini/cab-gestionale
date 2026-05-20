"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadMagazzinoChangeLog, MAGAZZINO_CHANGE_LOG_STORAGE_KEY } from "@/lib/magazzino/magazzino-change-log-storage";
import { magazzinoRowToRicambioUI } from "@/lib/magazzino/magazzino-db-ui-adapter";
import { splitLavorazioniListRowsForReport } from "@/lib/lavorazioni/lavorazioni-report-adapter";
import { toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { subscribeReportDataRefresh } from "@/lib/report/report-broadcast";
import { useMagazzinoListQuery, useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";

/** Tutte le lavorazioni non eliminate (in corso + archiviate); split report su `archived`. */
const LAV_LIST_FILTERS = { includeMezzo: true as const };

export function useReportLiveData() {
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  const lavQuery = useLavorazioniList(LAV_LIST_FILTERS, { staleTime: 30_000 });
  const magQuery = useMagazzinoListQuery();
  const mezziQuery = useMezziListQuery();

  useEffect(() => {
    const u4 = subscribeReportDataRefresh(bump);
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === MAGAZZINO_CHANGE_LOG_STORAGE_KEY) bump();
    };
    const onVis = () => {
      if (document.visibilityState === "visible") bump();
    };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      u4();
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [bump]);

  return useMemo(() => {
    const { attive, storico } = splitLavorazioniListRowsForReport(lavQuery.data ?? []);
    const magazzino = (magQuery.data ?? []).map((row) => magazzinoRowToRicambioUI(row));
    const mezzi = (mezziQuery.data ?? []).map(toMezzoUI);
    return {
      attive,
      storico,
      magazzino,
      mezzi,
      magLog: loadMagazzinoChangeLog(),
      isLoading: lavQuery.isLoading || magQuery.isLoading || mezziQuery.isLoading,
      isError: lavQuery.isError || magQuery.isError || mezziQuery.isError,
      tick,
    };
  }, [
    tick,
    lavQuery.data,
    lavQuery.isLoading,
    lavQuery.isError,
    magQuery.data,
    magQuery.isLoading,
    magQuery.isError,
    mezziQuery.data,
    mezziQuery.isLoading,
    mezziQuery.isError,
  ]);
}
