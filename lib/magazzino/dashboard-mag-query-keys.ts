/** KPI magazzino precomputati SSR dashboard — evita ricalcolo client su subset idratato. */
export const MAGAZZINO_DASHBOARD_KPI_QUERY_KEY = ["magazzino", "dashboardKpi"] as const;

export type MagazzinoDashboardKpi = {
  sottoScorta: number;
  capitale: number;
};
