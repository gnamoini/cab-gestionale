"use client";

import { useMemo } from "react";
import { resolvePresetRange } from "@/lib/report/date-ranges";
import { buildReportDerivedBundle } from "@/lib/report/report-derived-cache";
import { useReportLiveData } from "@/lib/report/use-report-live-data";

/** Shared dataset for operational analytics panels (non-Report surfaces). */
export function useOperationalLavorazioniData() {
  const anchor = useMemo(() => new Date(), []);
  const range = useMemo(() => resolvePresetRange(anchor, "last_3_months"), [anchor]);
  const live = useReportLiveData({ enableMezzi: true, enableMovimenti: true, enableManual: true });

  const derivedBundle = useMemo(
    () =>
      buildReportDerivedBundle({
        completate: live.completate,
        manualByMonth: live.manualByMonth,
        mezzi: live.mezzi,
        magLog: live.magLog,
        magazzino: live.magazzino,
        queryMeta: [],
      }),
    [live.completate, live.manualByMonth, live.mezzi, live.magLog, live.magazzino],
  );

  return {
    anchor,
    range,
    attive: live.attive,
    storico: live.storico,
    completate: live.completate,
    manualByMonth: live.manualByMonth,
    magazzino: live.magazzino,
    magLog: live.magLog,
    mezzi: live.mezzi,
    lavListRows: live.lavListRows,
    derivedBundle,
    isLoading: live.isLoading,
    isError: live.isError,
  };
}
