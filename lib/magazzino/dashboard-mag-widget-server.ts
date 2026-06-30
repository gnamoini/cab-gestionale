import { ricambioIdFromMagazzinoLogRow } from "@/lib/view/dashboard-magazzino-log-selectors";
import {
  computeDashboardMagSottoScortaRicambi,
} from "@/lib/view/dashboard-widgets-selectors";
import { computeReportMagazzinoKpiWidgetFromUi } from "@/lib/report/report-kpi-selectors";
import { mapMagazzinoRowsToUI } from "@/lib/magazzino/magazzino-list-cache";
import type { MagazzinoDashboardKpi } from "@/lib/magazzino/dashboard-mag-query-keys";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { LogModificaWithProfileRow, MagazzinoRicambioRow } from "@/src/types/supabase-tables";

export type DashboardMagLogPrefetchSlice = {
  rows: readonly LogModificaWithProfileRow[];
};

export type DashboardMagWidgetServerData = {
  kpi: MagazzinoDashboardKpi;
  /** Subset righe per widget dashboard (sotto scorta top-N + ricambi citati nei log). */
  subsetRows: MagazzinoRicambioRow[];
};

/** ponytail: KPI richiede scan completo meta lato server; al client idriamo solo subset mirato. */
export function buildDashboardMagWidgetFromReportRows(
  allRows: readonly MagazzinoRicambioRow[],
  logSlices: readonly DashboardMagLogPrefetchSlice[],
  mezziListe?: MezziListePrefs,
): DashboardMagWidgetServerData {
  const ui = mapMagazzinoRowsToUI(allRows, "Sistema", mezziListe);
  const kpi = computeReportMagazzinoKpiWidgetFromUi(ui);

  const sottoScortaIds = new Set(computeDashboardMagSottoScortaRicambi(ui).map((r) => r.id));
  const logRicambioIds = new Set<string>();
  for (const slice of logSlices) {
    for (const row of slice.rows) {
      const id = ricambioIdFromMagazzinoLogRow(row);
      if (id) logRicambioIds.add(id);
    }
  }

  const needed = new Set([...sottoScortaIds, ...logRicambioIds]);
  const subsetRows = needed.size > 0 ? allRows.filter((r) => needed.has(r.id)) : [];
  return { kpi, subsetRows };
}
