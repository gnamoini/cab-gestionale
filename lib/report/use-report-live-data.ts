"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import { GESTIONALE_LOG_FEED_LIMIT } from "@/lib/react-query/query-layer-policies";
import { assertReportBundleSane } from "@/lib/ops/sanity-assertions";
import { buildReportLavorazioniBundle } from "@/lib/report/lavorazioni-report-selectors";
import {
  readLocalMagazzinoLogCache,
  MAGAZZINO_CHANGE_LOG_STORAGE_KEY,
} from "@/lib/magazzino/magazzino-change-log-storage";
import { ricambioIdFromMovimentoRow } from "@/lib/magazzino/magazzino-log-feed-merge";
import { magazzinoRowToRicambioUI } from "@/lib/magazzino/magazzino-db-ui-adapter";
import { manualEntriesToByMonth } from "@/lib/report/report-manual-entries-map";
import { resolveMagazzinoReportLogEntries } from "@/lib/report/resolve-magazzino-report-log";
import { scheduleReportBroadcastRefresh } from "@/lib/report/report-refresh";
import { subscribeReportDataRefresh } from "@/lib/report/report-broadcast";
import { useReportViewQueryOpts } from "@/lib/view/view-query-opts";
import { useLogListQuery, useMagazzinoListQuery, useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useReportManualEntriesQuery } from "@/src/hooks/view/use-report-manual-entries";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";
import { logAutoreLabel, buildLogModificheDisplayEntries } from "@/lib/gestionale-log/log-modifiche-view-model";
import { toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";

/** Tutte le lavorazioni non eliminate (in corso + archiviate); split report su `archived`. */
const LAV_LIST_FILTERS = { includeMezzo: true as const };

export function useReportLiveData() {
  const queryClient = useQueryClient();
  const viewOpts = useReportViewQueryOpts();
  const [magLogVersion, setMagLogVersion] = useState(0);
  const readyLoggedRef = useRef(false);
  const errorLoggedRef = useRef(false);
  const loadStartRef = useRef(typeof performance !== "undefined" ? performance.now() : 0);

  const bumpMagLog = useCallback(() => setMagLogVersion((v) => v + 1), []);

  const scheduleRefresh = useCallback(() => {
    scheduleReportBroadcastRefresh(queryClient, bumpMagLog);
  }, [queryClient, bumpMagLog]);

  const lavQuery = useLavorazioniList(LAV_LIST_FILTERS, viewOpts);
  const magQuery = useMagazzinoListQuery(undefined, viewOpts);
  const mezziQuery = useMezziListQuery(undefined, viewOpts);
  const manualQuery = useReportManualEntriesQuery();
  const magLogsQ = useLogListQuery({ entita: "magazzino_ricambi", limit: GESTIONALE_LOG_FEED_LIMIT }, viewOpts);
  const movLogsQ = useLogListQuery({ entita: "movimenti_ricambi", limit: GESTIONALE_LOG_FEED_LIMIT }, viewOpts);

  useEffect(() => {
    const unsub = subscribeReportDataRefresh(scheduleRefresh);
    const onStorage = (e: StorageEvent) => {
      if (e.key === MAGAZZINO_CHANGE_LOG_STORAGE_KEY) bumpMagLog();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      unsub();
      window.removeEventListener("storage", onStorage);
    };
  }, [scheduleRefresh, bumpMagLog]);

  const isLoading =
    lavQuery.isLoading ||
    magQuery.isLoading ||
    mezziQuery.isLoading ||
    manualQuery.isLoading ||
    magLogsQ.isLoading ||
    movLogsQ.isLoading;

  const isError =
    lavQuery.isError || magQuery.isError || mezziQuery.isError || manualQuery.isError;

  useEffect(() => {
    if (isLoading) return;
    if (isError && !errorLoggedRef.current) {
      errorLoggedRef.current = true;
      trackRuntimeEvent(RuntimeEvents.reportDataError);
      return;
    }
    if (!isError && !readyLoggedRef.current) {
      readyLoggedRef.current = true;
      const durationMs = Math.round(performance.now() - loadStartRef.current);
      trackRuntimeEvent(RuntimeEvents.reportDataReady, { durationMs });
    }
  }, [isLoading, isError]);

  const bundle = useMemo(() => {
    const b = buildReportLavorazioniBundle(lavQuery.data ?? []);
    assertReportBundleSane(b, lavQuery.data?.length ?? 0);
    return b;
  }, [lavQuery.data]);

  const manualEntries = manualQuery.data ?? [];
  const manualByMonth = useMemo(() => manualEntriesToByMonth(manualEntries), [manualEntries]);

  const mapped = useMemo(() => {
    const magazzino = (magQuery.data ?? []).map((row) => magazzinoRowToRicambioUI(row));
    const mezzi = (mezziQuery.data ?? []).map(toMezzoUI);
    return { ...bundle, magazzino, mezzi };
  }, [bundle, magQuery.data, mezziQuery.data]);

  const serverRows = useMemo(
    () => [...(magLogsQ.data ?? []), ...(movLogsQ.data ?? [])],
    [magLogsQ.data, movLogsQ.data],
  );

  const magLog = useMemo(() => {
    void magLogVersion;
    const localEntries = readLocalMagazzinoLogCache();
    const prodottiById = new Map(mapped.magazzino.map((p) => [p.id, p]));
    const serverItems = buildLogModificheDisplayEntries(serverRows, (row) => logAutoreLabel(row, null, "Sistema"), {
      resolveOggetto: (row) => {
        if (row.entita === "magazzino_ricambi") return prodottiById.get(row.entita_id)?.descrizione;
        const rid = ricambioIdFromMovimentoRow(row);
        if (rid) return prodottiById.get(rid)?.descrizione;
        return undefined;
      },
    }).map((entry) => ({
      id: entry.id,
      source: "server" as const,
      ricambioId:
        entry.row.entita === "magazzino_ricambi"
          ? entry.row.entita_id
          : ricambioIdFromMovimentoRow(entry.row) ?? entry.row.entita_id,
      vm: entry.vm,
      localEntry: undefined,
      atMs: new Date(entry.row.created_at).getTime(),
    }));

    return resolveMagazzinoReportLogEntries(localEntries, serverRows, serverItems);
  }, [magLogVersion, serverRows, mapped.magazzino]);

  return useMemo(
    () => ({
      ...mapped,
      manualEntries,
      manualByMonth,
      magLog,
      isLoading,
      isError,
      manualLoading: manualQuery.isLoading,
      manualError: manualQuery.isError,
    }),
    [
      mapped,
      manualEntries,
      manualByMonth,
      magLog,
      isLoading,
      isError,
      manualQuery.isLoading,
      manualQuery.isError,
    ],
  );
}
