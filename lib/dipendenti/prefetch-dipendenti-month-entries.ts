import type { QueryClient } from "@tanstack/react-query";
import { dipendentiTimesheetEntry } from "@/lib/domain/dipendenti-timesheet-entry";
import { monthDateRange } from "@/lib/dipendenti/timesheet-month";
import type { TimesheetMonthKey } from "@/lib/dipendenti/types";
import { dipendentiEntriesQueryKey } from "@/src/hooks/gestionale/use-dipendenti-timesheet-queries";

/** Client prefetch presenze per un mese (navigazione ±1). */
export async function prefetchDipendentiMonthEntries(
  qc: QueryClient,
  monthKey: TimesheetMonthKey,
): Promise<void> {
  const { from, to } = monthDateRange(monthKey);
  await qc.prefetchQuery({
    queryKey: dipendentiEntriesQueryKey(from, to),
    queryFn: async () => {
      const res = await dipendentiTimesheetEntry.listEntriesForRange(from, to);
      if (!res.success) throw new Error(res.error ?? "Errore caricamento presenze.");
      return res.data ?? [];
    },
  });
}
