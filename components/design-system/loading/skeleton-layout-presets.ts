/**
 * Dimensioni skeleton allineate al layout reale — riduce layout shift al hydrate.
 */

export const SKELETON_MIN_HEIGHT = {
  pageHeader: "h-14",
  toolbar: "min-h-[4.5rem]",
  tableDesktop: "min-h-[28rem]",
  tableCompact: "min-h-[18rem]",
  tableDocumenti: "min-h-[24rem]",
  cardWidget: "min-h-[220px]",
  cardWidgetSm: "min-h-[152px]",
  cardMobile: "min-h-[140px]",
  cardPromemoria: "min-h-[280px]",
  chart: "min-h-[16rem]",
  chartWide: "min-h-[20rem]",
  kpiRow: "min-h-[4.5rem]",
  settingsNav: "min-h-[12rem]",
  settingsContent: "min-h-[24rem]",
  loginCard: "min-h-[22rem]",
  modalMd: "min-h-[20rem]",
  modalLg: "min-h-[28rem]",
} as const;

export const SKELETON_GRID = {
  dashboardKpi: "grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4",
  dashboardWidgetsLg: "hidden min-w-0 gap-4 lg:grid lg:grid-cols-2",
  dashboardWidgetsMobile: "space-y-3 lg:hidden",
  preventiviMobileStack: "mt-4 space-y-2",
  lavorazioniMobileStack: "mt-4 space-y-2",
} as const;
