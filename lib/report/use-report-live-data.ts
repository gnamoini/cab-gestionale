"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadMagazzinoChangeLog, MAGAZZINO_CHANGE_LOG_STORAGE_KEY } from "@/lib/magazzino/magazzino-change-log-storage";
import { magazzinoRowToRicambioUI } from "@/lib/magazzino/magazzino-db-ui-adapter";
import { splitLavorazioniListRowsForReport } from "@/lib/lavorazioni/lavorazioni-report-adapter";
import { toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { subscribeReportDataRefresh } from "@/lib/report/report-broadcast";
import { useViewQueryOpts } from "@/lib/view/view-query-opts";
import { useMagazzinoListQuery, useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";

/** Tutte le lavorazioni non eliminate (in corso + archiviate); split report su `archived`. */
const LAV_LIST_FILTERS = { includeMezzo: true as const };

export function useReportLiveData() {
  const viewOpts = useViewQueryOpts({ staleTime: 90_000 });
  const [magLogVersion, setMagLogVersion] = useState(0);

  const bumpMagLog = useCallback(() => setMagLogVersion((v) => v + 1), []);

  const lavQuery = useLavorazioniList(LAV_LIST_FILTERS, viewOpts);
  const magQuery = useMagazzinoListQuery(undefined, viewOpts);
  const mezziQuery = useMezziListQuery(undefined, viewOpts);

  useEffect(() => {
    const unsub = subscribeReportDataRefresh(bumpMagLog);
    const onStorage = (e: StorageEvent) => {
      if (e.key === MAGAZZINO_CHANGE_LOG_STORAGE_KEY) bumpMagLog();
    };
    let visTimer: ReturnType<typeof setTimeout> | null = null;
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (visTimer) clearTimeout(visTimer);
      visTimer = setTimeout(() => bumpMagLog(), 800);
    };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      unsub();
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVis);
      if (visTimer) clearTimeout(visTimer);
    };
  }, [bumpMagLog]);

  const mapped = useMemo(() => {
    const { attive, storico } = splitLavorazioniListRowsForReport(lavQuery.data ?? []);
    const magazzino = (magQuery.data ?? []).map((row) => magazzinoRowToRicambioUI(row));
    const mezzi = (mezziQuery.data ?? []).map(toMezzoUI);
    return { attive, storico, magazzino, mezzi };
  }, [lavQuery.data, magQuery.data, mezziQuery.data]);

  const magLog = useMemo(() => {
    void magLogVersion;
    return loadMagazzinoChangeLog();
  }, [magLogVersion]);

  return useMemo(
    () => ({
      ...mapped,
      magLog,
      isLoading: lavQuery.isLoading || magQuery.isLoading || mezziQuery.isLoading,
      isError: lavQuery.isError || magQuery.isError || mezziQuery.isError,
    }),
    [mapped, magLog, lavQuery.isLoading, magQuery.isLoading, mezziQuery.isLoading, lavQuery.isError, magQuery.isError, mezziQuery.isError],
  );
}
