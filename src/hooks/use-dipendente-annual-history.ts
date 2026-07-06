"use client";

import { useMemo } from "react";
import { computeAnnualMonthlyBreakdown } from "@/lib/dipendenti/timesheet-annual";
import { parseMonthKey, yearDateRange } from "@/lib/dipendenti/timesheet-month";
import type { TimesheetMonthKey } from "@/lib/dipendenti/types";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { QK } from "@/src/lib/react-query/query-keys";
import { dipendentiTimesheetEntry } from "@/lib/domain/dipendenti-timesheet-entry";

function annualQueryKey(employeeId: string, year: number) {
  return [...QK.dipendentiTimesheetEntries, "annual", employeeId, year] as const;
}

export function useDipendenteAnnualHistory(employeeId: string | null, monthKey: TimesheetMonthKey) {
  const { year } = parseMonthKey(monthKey);
  const { from, to } = yearDateRange(year);

  const query = useServiceQuery(
    employeeId ? annualQueryKey(employeeId, year) : (["dipendenti_timesheet_annual", "none"] as const),
    () => dipendentiTimesheetEntry.listEntriesForRange(from, to),
    { enabled: Boolean(employeeId) },
  );

  const months = useMemo(() => {
    if (!employeeId || !query.data) return [];
    return computeAnnualMonthlyBreakdown(query.data, employeeId, year);
  }, [employeeId, query.data, year]);

  const yearTotals = useMemo(() => {
    let oreOrdinarie = 0;
    let oreStraordinarie = 0;
    let oreAssenza = 0;
    let giorniAssenza = 0;
    for (const m of months) {
      oreOrdinarie += m.oreOrdinarie;
      oreStraordinarie += m.oreStraordinarie;
      oreAssenza += m.oreAssenza;
      giorniAssenza += m.giorniAssenza;
    }
    return {
      oreOrdinarie: Math.round(oreOrdinarie * 100) / 100,
      oreStraordinarie: Math.round(oreStraordinarie * 100) / 100,
      oreAssenza: Math.round(oreAssenza * 100) / 100,
      totaleLavorato: Math.round((oreOrdinarie + oreStraordinarie) * 100) / 100,
      giorniAssenza,
    };
  }, [months]);

  return {
    year,
    months,
    yearTotals,
    isLoading: query.isLoading,
    isError: query.isError,
    errorMessage: query.error?.message ?? null,
    refetch: () => {
      void query.refetch();
    },
  };
}
