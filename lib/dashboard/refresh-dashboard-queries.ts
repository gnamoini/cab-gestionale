import type { QueryClient } from "@tanstack/react-query";
import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";
import { MAGAZZINO_DASHBOARD_KPI_QUERY_KEY } from "@/lib/magazzino/dashboard-mag-query-keys";
import { collectQueryKeysForGestionaleTables } from "@/src/lib/react-query/invalidate-targets";

/** Allineato a ControlTowerMetricsProvider — scope sync dashboard. */
export const DASHBOARD_REFRESH_TABLES = [
  "log_modifiche",
  "lavorazioni",
  "scheda_lavorazione",
  "magazzino_ricambi",
  "movimenti_ricambi",
  "preventivi",
  "invoices",
  "invoice_payments",
  "ddt_documents",
  "dashboard_promemoria",
  "dipendenti_timesheet_entries",
] as const;

/** Invalida e refetch query client dashboard senza reload RSC. */
export async function refreshDashboardQueries(queryClient: QueryClient): Promise<void> {
  const keys = collectQueryKeysForGestionaleTables([...DASHBOARD_REFRESH_TABLES]);
  await Promise.all(
    keys.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey, refetchType: "active" }),
    ),
  );
  await queryClient.invalidateQueries({
    queryKey: MAGAZZINO_DASHBOARD_KPI_QUERY_KEY,
    refetchType: "active",
  });
  bumpReportDataRefresh();
}
