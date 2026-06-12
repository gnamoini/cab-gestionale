"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import { mapMagazzinoRowsToUI } from "@/lib/magazzino/magazzino-list-cache";
import { scheduleCompatBackgroundAudit } from "@/lib/magazzino/compat/compat-runtime-sanitize";
import {
  ReportDataIntegrityLayer,
  type ReportIntegrityQueryMeta,
} from "@/lib/report/report-data-integrity-layer";
import { fingerprintReportSnapshot } from "@/lib/report/report-derived-cache";
import { scheduleReportBroadcastRefresh } from "@/lib/report/report-refresh";
import { subscribeReportDataRefresh } from "@/lib/report/report-broadcast";
import { useReportViewQueryOpts } from "@/lib/view/view-query-opts";
import {
  enrichLavorazioneListRowsWithMezzi,
  mezziRowsToIdMap,
} from "@/lib/db/dto-mappers";
import { useMagazzinoListQuery, useMezziListQuery, useMovimentiListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { useReportManualEntriesQuery } from "@/src/hooks/view/use-report-manual-entries";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";
import { toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";

/** Tutte le lavorazioni non eliminate; mezzo join client-side da anagrafica slim. */
const LAV_LIST_FILTERS = { includeMezzo: false as const, fetchMode: "report" as const };

function queryMetaFrom(
  source: ReportIntegrityQueryMeta["source"],
  q: { isError: boolean; isFetching: boolean; dataUpdatedAt: number; data?: unknown },
): ReportIntegrityQueryMeta {
  const rowCount = Array.isArray(q.data) ? q.data.length : q.data != null ? 1 : 0;
  return {
    source,
    isError: q.isError,
    isFetching: q.isFetching,
    dataUpdatedAt: q.dataUpdatedAt,
    rowCount,
  };
}

function queryMetaForDataset(
  source: ReportIntegrityQueryMeta["source"],
  q: { isError: boolean; dataUpdatedAt: number; data?: unknown },
): ReportIntegrityQueryMeta {
  const rowCount = Array.isArray(q.data) ? q.data.length : q.data != null ? 1 : 0;
  return {
    source,
    isError: q.isError,
    isFetching: false,
    dataUpdatedAt: q.dataUpdatedAt,
    rowCount,
  };
}

function partialFetchFindings(queryMeta: readonly ReportIntegrityQueryMeta[]) {
  const findings: { code: "partial_fetch"; severity: "warning"; message: string }[] = [];
  for (const q of queryMeta) {
    if (q.isFetching && q.rowCount > 0) {
      findings.push({
        code: "partial_fetch",
        severity: "warning",
        message: `Refetch in corso su ${q.source} con dati già in cache`,
      });
    }
  }
  return findings;
}

export function useReportLiveData() {
  const queryClient = useQueryClient();
  const viewOpts = useReportViewQueryOpts();
  const readyLoggedRef = useRef(false);
  const errorLoggedRef = useRef(false);
  const loadStartRef = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const lastCompatAuditFingerprintRef = useRef<string | null>(null);

  const scheduleRefresh = useCallback(() => {
    scheduleReportBroadcastRefresh(queryClient, () => {});
  }, [queryClient]);

  const lavQuery = useLavorazioniList(LAV_LIST_FILTERS, viewOpts);
  const magQuery = useMagazzinoListQuery(undefined, { ...viewOpts, variant: "report" });
  const mezziQuery = useMezziListQuery(undefined, { ...viewOpts, variant: "report" });
  const movimentiQuery = useMovimentiListQuery(undefined, viewOpts);
  const settingsPayload = useCabAppSettingsPayloadQuery({ tier: "static" });
  const mezziListe = settingsPayload.data?.resolved?.mezziListe;
  const manualQuery = useReportManualEntriesQuery();

  useEffect(() => {
    const unsub = subscribeReportDataRefresh(scheduleRefresh);
    return () => {
      unsub();
    };
  }, [scheduleRefresh]);

  const isLoading =
    lavQuery.isLoading ||
    magQuery.isLoading ||
    mezziQuery.isLoading ||
    movimentiQuery.isLoading ||
    manualQuery.isLoading;

  const queryFailed =
    lavQuery.isError ||
    magQuery.isError ||
    mezziQuery.isError ||
    movimentiQuery.isError ||
    manualQuery.isError;

  const isFetching =
    lavQuery.isFetching ||
    magQuery.isFetching ||
    mezziQuery.isFetching ||
    movimentiQuery.isFetching ||
    manualQuery.isFetching;

  const lavListRows = useMemo(() => {
    const rows = lavQuery.data ?? [];
    const needsClientEnrich = rows.some((row) => Boolean(row.mezzo_id?.trim()) && row.mezzo == null);
    if (!needsClientEnrich) return rows;
    const mezziById = mezziRowsToIdMap(mezziQuery.data ?? []);
    return enrichLavorazioneListRowsWithMezzi(rows, mezziById);
  }, [lavQuery.data, mezziQuery.data]);

  const integrityData = useMemo(() => {
    const magazzino = mapMagazzinoRowsToUI(magQuery.data ?? [], "Sistema", mezziListe);
    const mezzi = (mezziQuery.data ?? []).map(toMezzoUI);
    const queryMeta: ReportIntegrityQueryMeta[] = [
      queryMetaForDataset("lavorazioni", lavQuery),
      queryMetaForDataset("magazzino", magQuery),
      queryMetaForDataset("mezzi", mezziQuery),
      queryMetaForDataset("movimenti", movimentiQuery),
      queryMetaForDataset("manualEntries", manualQuery),
    ];
    const allLavorazioni = lavListRows;
    const lavorazioniArchivioRaw = lavQuery.isError ? [] : allLavorazioni.filter((row) => row.archived === true);
    return ReportDataIntegrityLayer.buildValidatedDataset({
      lavorazioniRaw: allLavorazioni,
      lavorazioniArchivioRaw,
      magazzino,
      mezzi,
      movimenti: movimentiQuery.data ?? [],
      manualEntries: manualQuery.data ?? [],
      queryMeta,
      onSevereCacheDrift: scheduleRefresh,
    });
  }, [
    lavListRows,
    lavQuery.isError,
    lavQuery.dataUpdatedAt,
    magQuery.data,
    magQuery.isError,
    magQuery.dataUpdatedAt,
    mezziQuery.data,
    mezziQuery.isError,
    mezziQuery.dataUpdatedAt,
    movimentiQuery.data,
    movimentiQuery.isError,
    movimentiQuery.dataUpdatedAt,
    manualQuery.data,
    manualQuery.isError,
    manualQuery.dataUpdatedAt,
    mezziListe,
    scheduleRefresh,
  ]);

  const integrityView = useMemo(() => {
    const queryMeta: ReportIntegrityQueryMeta[] = [
      queryMetaFrom("lavorazioni", lavQuery),
      queryMetaFrom("magazzino", magQuery),
      queryMetaFrom("mezzi", mezziQuery),
      queryMetaFrom("movimenti", movimentiQuery),
      queryMetaFrom("manualEntries", manualQuery),
    ];
    const manualEntryCount = integrityData.manualEntries.filter((e) => !e.deleted_at).length;
    const fetchFindings = partialFetchFindings(queryMeta);
    const hasQueryError = queryMeta.some((q) => q.isError);
    const hasWarning =
      integrityData.audit.findings.some((f) => f.severity === "warning" || f.severity === "critical") ||
      fetchFindings.length > 0;
    let status = integrityData.status;
    if (integrityData.audit.strictBlocked) {
      status = "blocked";
    } else if (hasQueryError || hasWarning) {
      status = "degraded";
    } else {
      status = "ok";
    }
    return {
      status,
      audit: {
        ...integrityData.audit,
        findings: [...integrityData.audit.findings, ...fetchFindings],
      },
      queryMeta,
      manualEntryCount,
      isLoading,
      isFetching,
    };
  }, [
    integrityData,
    lavQuery.isError,
    lavQuery.isFetching,
    lavQuery.dataUpdatedAt,
    lavQuery.data,
    magQuery.isError,
    magQuery.isFetching,
    magQuery.dataUpdatedAt,
    magQuery.data,
    mezziQuery.isError,
    mezziQuery.isFetching,
    mezziQuery.dataUpdatedAt,
    mezziQuery.data,
    movimentiQuery.isError,
    movimentiQuery.isFetching,
    movimentiQuery.dataUpdatedAt,
    movimentiQuery.data,
    manualQuery.isError,
    manualQuery.isFetching,
    manualQuery.dataUpdatedAt,
    manualQuery.data,
    isLoading,
    isFetching,
  ]);

  const snapshotFingerprint = useMemo(
    () =>
      fingerprintReportSnapshot({
        completate: integrityData.completate,
        magLog: integrityData.magLog,
        magazzino: integrityData.magazzino,
        manualByMonth: integrityData.manualByMonth,
        queryMeta: integrityView.queryMeta,
      }),
    [integrityData, integrityView.queryMeta],
  );

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
