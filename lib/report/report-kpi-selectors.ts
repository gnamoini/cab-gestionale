import { capitaleImmobilizzato } from "@/lib/magazzino/calculations";
import { magazzinoRowToRicambioUI } from "@/lib/magazzino/magazzino-db-ui-adapter";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import {
  computeDashboardMagStatsFromRows,
  computeDashboardMagStatsFromUi,
  type DashboardMagStats,
} from "@/lib/view/view-aggregation-cache";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

export type ReportMagazzinoKpi = {
  sottoScorta: number;
  capitale: number;
  tot: number;
};

/** KPI magazzino condivisi dashboard + report (stessa semantica numerica). */
export function computeReportMagazzinoKpiFromRows(
  rows: readonly MagazzinoRicambioRow[],
  staging = false,
): ReportMagazzinoKpi {
  const stats: DashboardMagStats = computeDashboardMagStatsFromRows(rows, staging);
  return { sottoScorta: stats.sotto, capitale: stats.cap, tot: stats.tot };
}

export function computeReportMagazzinoKpiFromUi(items: readonly RicambioMagazzino[]): ReportMagazzinoKpi {
  const stats = computeDashboardMagStatsFromUi(items);
  return { sottoScorta: stats.sotto, capitale: stats.cap, tot: stats.tot };
}

export function computeReportMagazzinoKpiWidgetFromUi(
  items: readonly RicambioMagazzino[],
): { sottoScorta: number; capitale: number } {
  const sottoScorta = items.filter((p) => p.scortaMinima > 0 && p.scorta < p.scortaMinima).length;
  const capitale = items.reduce((acc, r) => acc + capitaleImmobilizzato(r), 0);
  return { sottoScorta, capitale };
}

export { magazzinoRowToRicambioUI };
