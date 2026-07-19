import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";
import type { SkeletonGeometry, SkeletonGeometryToken } from "./skeleton-contract";

/** Toolbar + tabella nello stesso ShellCard (mezzi, documenti, magazzino, preventivi). */
export const GESTIONALE_COMBINED_LIST_GEOMETRY_MIN = "min-h-[33rem]" as const;

export type GeometryResolved = {
  minHeightClass: string;
  aspectRatioClass?: string;
  widthClass?: string;
};

const ASPECT_CLASS: Record<NonNullable<SkeletonGeometry["aspectRatio"]>, string> = {
  video: "aspect-video",
  square: "aspect-square",
};

const WIDTH_CLASS: Record<NonNullable<SkeletonGeometry["width"]>, string> = {
  full: "w-full",
  half: "w-full max-w-[50%]",
  grid: "min-w-0 w-full",
};

/** SSOT: token semantico → classi Tailwind (geometry parity content/skeleton). */
export const SKELETON_GEOMETRY: Record<SkeletonGeometryToken, GeometryResolved> = {
  toolbar: { minHeightClass: SKELETON_MIN_HEIGHT.toolbar },
  card: { minHeightClass: SKELETON_MIN_HEIGHT.cardWidget },
  "card-sm": { minHeightClass: SKELETON_MIN_HEIGHT.cardWidgetSm },
  table: { minHeightClass: SKELETON_MIN_HEIGHT.tableDesktop },
  "table-compact": { minHeightClass: SKELETON_MIN_HEIGHT.tableCompact },
  "table-documenti": { minHeightClass: SKELETON_MIN_HEIGHT.tableDocumenti },
  "inventory-table": { minHeightClass: GESTIONALE_COMBINED_LIST_GEOMETRY_MIN },
  chart: { minHeightClass: SKELETON_MIN_HEIGHT.chart },
  "chart-wide": { minHeightClass: SKELETON_MIN_HEIGHT.chartWide },
  "kpi-row": { minHeightClass: SKELETON_MIN_HEIGHT.kpiRow },
  "settings-content": { minHeightClass: SKELETON_MIN_HEIGHT.settingsContent },
  "login-card": { minHeightClass: SKELETON_MIN_HEIGHT.loginCard },
  "page-header": { minHeightClass: SKELETON_MIN_HEIGHT.pageHeader },
  "tab-bar": { minHeightClass: SKELETON_MIN_HEIGHT.tabBar },
  "card-promemoria": { minHeightClass: SKELETON_MIN_HEIGHT.cardPromemoria },
  welcome: { minHeightClass: "min-h-[7.5rem]" },
  "agenda-main": { minHeightClass: SKELETON_MIN_HEIGHT.agendaMain },
  "agenda-calendar": { minHeightClass: SKELETON_MIN_HEIGHT.agendaCalendar },
  "agenda-sidebar": { minHeightClass: SKELETON_MIN_HEIGHT.agendaSidebar },
  "settings-nav": { minHeightClass: SKELETON_MIN_HEIGHT.settingsNav },
  "production-readiness-outcome": { minHeightClass: SKELETON_MIN_HEIGHT.productionReadinessOutcome },
  "production-readiness-card": { minHeightClass: SKELETON_MIN_HEIGHT.productionReadinessCard },
  "sicurezza-panel": { minHeightClass: SKELETON_MIN_HEIGHT.sicurezzaPanel },
};

export function resolveGeometryClasses(geometry: SkeletonGeometry): string {
  const base = SKELETON_GEOMETRY[geometry.height];
  const parts = [
    base.minHeightClass,
    geometry.width ? WIDTH_CLASS[geometry.width] : base.widthClass,
    geometry.aspectRatio ? ASPECT_CLASS[geometry.aspectRatio] : base.aspectRatioClass,
  ].filter(Boolean);
  return parts.join(" ");
}
