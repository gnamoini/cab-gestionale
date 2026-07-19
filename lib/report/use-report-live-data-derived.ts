"use client";

import { useMemo } from "react";
import { coerceLavorazioniListRowsFromCache } from "@/lib/lavorazioni/lavorazioni-infinite-cache";
import { mapMagazzinoRowsToUI } from "@/lib/magazzino/magazzino-list-cache";
import { enrichLavorazioneListRowsWithMezzi } from "@/lib/db/dto-mappers";
import { mezziGestitiToEmbedMap } from "@/lib/mezzi/mezzi-attrezzature-batch";
import {
  ReportDataIntegrityLayer,
  type ReportIntegrityQueryMeta,
} from "@/lib/report/report-data-integrity-layer";
import { fingerprintReportSnapshot } from "@/lib/report/report-derived-cache";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import type { MovimentoRicambioRow } from "@/src/types/supabase-tables";
import type { ReportManualEntryRow } from "@/src/types/supabase-tables";

type QuerySlice = {
  isError: boolean;
  isFetching: boolean;
  dataUpdatedAt: number;
  data?: unknown;
};

function queryMetaFrom(source: ReportIntegrityQueryMeta["source"], q: QuerySlice): ReportIntegrityQueryMeta {
  const rowCount = Array.isArray(q.data) ? q.data.length : q.data != null ? 1 : 0;
  return {
    source,
    isError: q.isError,
    isFetching: q.isFetching,
    dataUpdatedAt: q.dataUpdatedAt,
    rowCount,
  };
}

function queryMetaForDataset(source: ReportIntegrityQueryMeta["source"], q: QuerySlice): ReportIntegrityQueryMeta {
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

export type ReportLiveDataDerivedInput = {
  lavRows: readonly LavorazioneListRow[];
  lavQuery: QuerySlice;
  magRows: readonly MagazzinoRicambioRow[];
  magQuery: QuerySlice;
  mezziRows: readonly MezzoGestito[];
  mezziQuery: QuerySlice;
  movimentiRows: readonly MovimentoRicambioRow[];
  movimentiQuery: QuerySlice;
  manualRows: readonly ReportManualEntryRow[];
  manualQuery: QuerySlice;
  mezziListe: Parameters<typeof mapMagazzinoRowsToUI>[2];
  isLoading: boolean;
  isFetching: boolean;
  onSevereCacheDrift: () => void;
};

export function useReportLiveDataDerived(input: ReportLiveDataDerivedInput) {
  const lavListRows = useMemo(() => {
    const rows = coerceLavorazioniListRowsFromCache(input.lavRows);
    const needsClientEnrich = rows.some((row) => Boolean(row.mezzo_id?.trim()) && row.mezzo == null);
    if (!needsClientEnrich) return rows;
    const mezziById = mezziGestitiToEmbedMap(input.mezziRows);
    return enrichLavorazioneListRowsWithMezzi(rows, mezziById);
  }, [input.lavRows, input.mezziRows]);

  const integrityData = useMemo(() => {
    const magazzino = mapMagazzinoRowsToUI(input.magRows, "Sistema", input.mezziListe);
    const queryMeta: ReportIntegrityQueryMeta[] = [
      queryMetaForDataset("lavorazioni", input.lavQuery),
      queryMetaForDataset("magazzino", input.magQuery),
      queryMetaForDataset("mezzi", input.mezziQuery),
      queryMetaForDataset("movimenti", input.movimentiQuery),
      queryMetaForDataset("manualEntries", input.manualQuery),
    ];
    const lavorazioniArchivioRaw = input.lavQuery.isError
      ? []
      : lavListRows.filter((row) => row.archived === true);
    return ReportDataIntegrityLayer.buildValidatedDataset({
      lavorazioniRaw: lavListRows,
      lavorazioniArchivioRaw,
      magazzino,
      mezzi: [...input.mezziRows],
      movimenti: [...input.movimentiRows],
      manualEntries: [...input.manualRows],
      queryMeta,
      onSevereCacheDrift: input.onSevereCacheDrift,
    });
  }, [
    lavListRows,
    input.lavQuery,
    input.magRows,
    input.magQuery,
    input.mezziRows,
    input.mezziQuery,
    input.movimentiRows,
    input.movimentiQuery,
    input.manualRows,
    input.manualQuery,
    input.mezziListe,
    input.onSevereCacheDrift,
  ]);

  const integrityView = useMemo(() => {
    const queryMeta: ReportIntegrityQueryMeta[] = [
      queryMetaFrom("lavorazioni", input.lavQuery),
      queryMetaFrom("magazzino", input.magQuery),
      queryMetaFrom("mezzi", input.mezziQuery),
      queryMetaFrom("movimenti", input.movimentiQuery),
      queryMetaFrom("manualEntries", input.manualQuery),
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
      isLoading: input.isLoading,
      isFetching: input.isFetching,
    };
  }, [integrityData, input]);

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

  return { lavListRows, integrityData, integrityView, snapshotFingerprint };
}
