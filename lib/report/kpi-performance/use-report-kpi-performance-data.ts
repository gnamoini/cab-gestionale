"use client";

import { useMemo } from "react";
import { buildKpiPerformanceModel } from "@/lib/report/kpi-performance/build-kpi-performance-model";
import type { KpiPerformanceModel } from "@/lib/report/kpi-performance/kpi-performance-types";
import type { DateRange, ReportCompareMode } from "@/lib/report/date-ranges";
import type { ReportSemanticIndex } from "@/lib/report/report-semantic-index";
import type { useReportLiveData } from "@/lib/report/use-report-live-data";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";

type LiveSlice = Pick<
  ReturnType<typeof useReportLiveData>,
  "lavListRows" | "attive" | "completate" | "mezzi" | "magazzino" | "magLog" | "isLoading"
>;

export function useReportKpiPerformanceData({
  anchor,
  range,
  compareRange,
  compareMode = "none",
  live,
  semanticIndex,
  enabled = true,
}: {
  anchor: Date;
  range: DateRange;
  compareRange: DateRange | null;
  compareMode?: ReportCompareMode;
  live: LiveSlice;
  semanticIndex: ReportSemanticIndex;
  enabled?: boolean;
}): {
  model: KpiPerformanceModel | null;
  isLoading: boolean;
  schedeLoaded: boolean;
} {
  const lavRows = live.lavListRows;
  const schedeLavorazioneIds = useMemo(() => lavRows.map((row) => row.id), [lavRows]);
  const { store: schedeStore, isLoading: schedeLoading } = useSchedeBundlesQuery(!live.isLoading && enabled, {
    lavorazioneIds: schedeLavorazioneIds,
  });
  const settingsQ = useCabAppSettingsPayloadQuery({ tier: "static" });

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

  const model = useMemo(() => {
    if (!enabled || live.isLoading) return null;
    return buildKpiPerformanceModel({
      anchor,
      range,
      compareRange,
      compareMode,
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
    enabled,
    live.isLoading,
    live.attive,
    live.completate,
    live.mezzi,
    live.magazzino,
    live.magLog,
    lavRows,
    anchor,
    range,
    compareRange,
    compareMode,
    magazzinoRows,
    semanticIndex,
    schedeStore,
    schedeLoading,
    costoOrario,
  ]);

  return {
    model,
    isLoading: enabled && live.isLoading,
    schedeLoaded: !enabled || !schedeLoading,
  };
}
