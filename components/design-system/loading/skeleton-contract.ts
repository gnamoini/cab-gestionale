/** Structural skeleton — tipi contratto (descriptor dichiarativi, no DOM parsing). */

export type SkeletonKind =
  | "block"
  | "card"
  | "table"
  | "chart"
  | "toolbar"
  | "grid"
  | "stack"
  | "combined-list"
  | "tab-bar";

/** Token semantico — consumer usano solo questi, non min-h arbitrari. */
export type SkeletonGeometryToken =
  | "toolbar"
  | "card"
  | "card-sm"
  | "table"
  | "table-compact"
  | "table-documenti"
  | "inventory-table"
  | "chart"
  | "chart-wide"
  | "kpi-row"
  | "settings-content"
  | "login-card"
  | "page-header"
  | "tab-bar"
  | "card-promemoria"
  | "welcome"
  | "agenda-main"
  | "agenda-calendar"
  | "agenda-sidebar"
  | "settings-nav"
  | "production-readiness-outcome"
  | "production-readiness-card"
  | "sicurezza-panel";

export type SkeletonGeometryWidth = "full" | "half" | "grid";

export type SkeletonGeometryAspect = "video" | "square";

export type SkeletonGeometry = {
  height: SkeletonGeometryToken;
  width?: SkeletonGeometryWidth;
  aspectRatio?: SkeletonGeometryAspect;
  responsive?: {
    mobile?: SkeletonGeometryToken;
    tablet?: SkeletonGeometryToken;
    desktop?: SkeletonGeometryToken;
  };
};

export type SkeletonContract = {
  kind: SkeletonKind;
  geometry: SkeletonGeometry;
  className?: string;
  itemCount?: number;
  sectionLabel?: string;
  children?: SkeletonContract[];
};

export type SkeletonMode = "content" | "skeleton";
