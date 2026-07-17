"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import { scheduleCompatBackgroundAudit } from "@/lib/magazzino/compat/compat-runtime-sanitize";
import { scheduleReportBroadcastRefresh } from "@/lib/report/report-refresh";
import { subscribeReportDataRefresh } from "@/lib/report/report-broadcast";
import { useReportLiveDataDerived } from "@/lib/report/use-report-live-data-derived";
import { useReportViewQueryOpts } from "@/lib/view/view-query-opts";
import { useMagazzinoListQuery, useMezziListQuery, useMovimentiListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useReportLavorazioniQuery, useReportManualEntriesQuery } from "@/src/hooks/gestionale/use-report-queries";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";

import type { ReportSectionId } from "@/components/report/report-sections-config";

export type ReportLiveDataOptions = {
  enableMezzi?: boolean;
  enableMovimenti?: boolean;
  enableManual?: boolean;
};

export function useReportLiveData(options?: ReportLiveDataOptions) {
  const queryClient = useQueryClient();
  const viewOpts = useReportViewQueryOpts();
  const readyLoggedRef = useRef(false);
  const errorLoggedRef = useRef(false);
  const loadStartRef = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const lastCompatAuditFingerprintRef = useRef<string | null>(null);

  const scheduleRefresh = useCallback(() => {
    scheduleReportBroadcastRefresh(queryClient, () => {});
  }, [queryClient]);

  const enableMezzi = options?.enableMezzi !== false;
  const enableMovimenti = options?.enableMovimenti !== false;
  const enableManual = options?.enableManual !== false;

  const lavQuery = useReportLavorazioniQuery(viewOpts);
  const magQuery = useMagazzinoListQuery(undefined, { ...viewOpts, variant: "report" });
  const mezziQuery = useMezziListQuery(undefined, { ...viewOpts, variant: "report", enabled: enableMezzi });
  const movimentiQuery = useMovimentiListQuery(undefined, { ...viewOpts, enabled: enableMovimenti });
  const settingsPayload = useCabAppSettingsPayloadQuery({ tier: "static" });
  const mezziListe = settingsPayload.data?.resolved?.mezziListe;
  const manualQuery = useReportManualEntriesQuery({ enabled: enableManual });

  useEffect(() => {
    const unsub = subscribeReportDataRefresh(scheduleRefresh);
    return () => {
      unsub();
    };
  }, [scheduleRefresh]);

  const isLoading =
    lavQuery.isLoading ||
    magQuery.isLoading ||
    (enableMezzi && mezziQuery.isLoading) ||
    (enableMovimenti && movimentiQuery.isLoading) ||
    (enableManual && manualQuery.isLoading);

  const queryFailed =
    lavQuery.isError ||
    magQuery.isError ||
    (enableMezzi && mezziQuery.isError) ||
    (enableMovimenti && movimentiQuery.isError) ||
    (enableManual && manualQuery.isError);

  const isFetching =
    lavQuery.isFetching ||
    magQuery.isFetching ||
    (enableMezzi && mezziQuery.isFetching) ||
    (enableMovimenti && movimentiQuery.isFetching) ||
    (enableManual && manualQuery.isFetching);

  const { lavListRows, integrityData, integrityView, snapshotFingerprint } = useReportLiveDataDerived({
    lavRows: lavQuery.data ?? [],
    lavQuery,
    magRows: magQuery.data ?? [],
    magQuery,
    mezziRows: mezziQuery.data ?? [],
    mezziQuery,
    movimentiRows: movimentiQuery.data ?? [],
    movimentiQuery,
    manualRows: manualQuery.data ?? [],
    manualQuery,
    mezziListe,
    isLoading,
    isFetching,
    onSevereCacheDrift: scheduleRefresh,
  });

  const isError = queryFailed || integrityData.status === "blocked";

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

  useEffect(() => {
    if (integrityData.magazzino.length === 0) return;
    if (lastCompatAuditFingerprintRef.current === snapshotFingerprint) return;
    lastCompatAuditFingerprintRef.current = snapshotFingerprint;
    scheduleCompatBackgroundAudit(integrityData.magazzino, mezziListe, "useReportLiveData.magazzino");
  }, [integrityData.magazzino, mezziListe, snapshotFingerprint]);

  return useMemo(
    () => ({
      lavListRows,
      attive: integrityData.attive,
      storico: integrityData.storico,
      completate: integrityData.completate,
      magazzino: integrityData.magazzino,
      mezzi: integrityData.mezzi,
      manualEntries: integrityData.manualEntries,
      manualByMonth: integrityData.manualByMonth,
      magLog: integrityData.magLog,
      snapshotFingerprint,
      isLoading,
      isError,
      manualLoading: manualQuery.isLoading,
      manualError: manualQuery.isError,
      integrityView,
    }),
    [
      integrityData,
      lavListRows,
      snapshotFingerprint,
      isLoading,
      isError,
      manualQuery.isLoading,
      manualQuery.isError,
      integrityView,
    ],
  );
}
