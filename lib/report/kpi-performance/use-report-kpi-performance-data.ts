"use client";

import { useMemo } from "react";
import { buildKpiPerformanceModel } from "@/lib/report/kpi-performance/build-kpi-performance-model";
import type { KpiPerformanceModel } from "@/lib/report/kpi-performance/kpi-performance-types";
import type { DateRange } from "@/lib/report/date-ranges";
import type { ReportSemanticIndex } from "@/lib/report/report-semantic-index";
import type { useReportLiveData } from "@/lib/report/use-report-live-data";
import { useReportViewQueryOpts } from "@/lib/view/view-query-opts";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";

type LiveSlice = Pick<
  ReturnType<typeof useReportLiveData>,
  "attive" | "completate" | "mezzi" | "magazzino" | "magLog" | "isLoading"
>;

export function useReportKpiPerformanceData({
  anchor,
  range,
  compareRange,
  live,
  semanticIndex,
}: {
  anchor: Date;
  range: DateRange;
  compareRange: DateRange | null;
  live: LiveSlice;
  semanticIndex: ReportSemanticIndex;
}): {
  model: KpiPerformanceModel | null;
  isLoading: boolean;
  schedeLoaded: boolean;
} {
  const viewOpts = useReportViewQueryOpts();
  const lavQuery = useLavorazioniList({ includeMezzo: true }, viewOpts);
  const schedeLavorazioneIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of lavQuery.data ?? []) ids.add(row.id);
    for (const row of live.attive) ids.add(row.id);
    for (const row of live.completate) ids.add(row.id);
    return [...ids];
  }, [lavQuery.data, live.attive, live.completate]);
  const { store: schedeStore, isLoading: schedeLoading } = useSchedeBundlesQuery(!live.isLoading, {
    lavorazioneIds: schedeLavorazioneIds,
  });
  const settingsQ = useCabAppSettingsPayloadQuery();

  const costoOrario = useMemo(() => {
    const v = settingsQ.data?.resolved?.preventiviDefaults?.costoOrarioDefault;
    return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 48;
  }, [settingsQ.data]);

  const magazzinoRows = useMemo(() => {
    return live.magazzino.map((p) => ({
      id: p.id,
      costo: p.prezzoFornitoreOriginale,
    })) as import("@/src/types/supabase-tables").MagazzinoRicambioRow[];
  }, [live.magazzino]);

  const lavRows = lavQuery.data ?? [];

  const model = useMemo(() => {
    if (live.isLoading || lavQuery.isLoading) return null;
    return buildKpiPerformanceModel({
      anchor,
      range,
      compareRange,
      attive: live.attive,
      completate: live.completate,
      mezzi: live.mezzi,
      magazzino: live.magazzino,
      magLog: live.magLog,
      magazzinoRows,
      lavRows,
      semanticIndex,
      schedeStore: schedeStore ?? null,
      schedeLoaded: !schedeLoading,
      costoOrario,
    });
  }, [
    live.isLoading,
    live.attive,
    live.completate,
    live.mezzi,
    live.magazzino,
    live.magLog,
    lavQuery.isLoading,
    lavRows,
    anchor,
    range,
    compareRange,
    magazzinoRows,
    semanticIndex,
    schedeStore,
    schedeLoading,
    costoOrario,
  ]);

  return {
    model,
    isLoading: live.isLoading || lavQuery.isLoading,
    schedeLoaded: !schedeLoading,
  };
}
