/**
 * UI OS — schema dichiarativo per varianti shell (toolbar/table/modal/layout).
 */

export type ToolbarVariant = "standard" | "dense" | "legacy";
export type TableVariant = "global" | "legacy";
export type ModalVariant = "ds" | "gestionale-shell" | "legacy";
export type LayoutVariant = "gestionale-core" | "report-dashboard" | "legacy";
export type UIDensity = "compact" | "normal" | "comfortable";

export type UIPageSchema = {
  toolbar?: ToolbarVariant;
  table?: TableVariant;
  modal?: ModalVariant;
  layout?: LayoutVariant;
  density?: UIDensity;
};

export type UIPageMode = "legacy" | "shadow" | "os";

export const DEFAULT_PAGE_SCHEMA: UIPageSchema = {
  toolbar: "standard",
  table: "global",
  modal: "ds",
  layout: "gestionale-core",
  density: "normal",
};

/** Canonical suggested schemas per route (Phase 1 shadow mode). */
export const SUGGESTED_PAGE_SCHEMAS: Record<string, UIPageSchema> = {
  "/lavorazioni": {
    toolbar: "standard",
    table: "global",
    modal: "gestionale-shell",
    layout: "gestionale-core",
    density: "normal",
  },
  "/magazzino": {
    toolbar: "standard",
    table: "global",
    modal: "gestionale-shell",
    layout: "gestionale-core",
    density: "normal",
  },
  "/report": {
    toolbar: "legacy",
    table: "legacy",
    modal: "ds",
    layout: "report-dashboard",
    density: "normal",
  },
};

export function normalizePageId(pageId: string): string {
  const base = pageId.split(":")[0] ?? pageId;
  if (base.includes(":kanban")) return "/lavorazioni";
  return base;
}

export function getSuggestedSchema(pageId: string): UIPageSchema {
  const key = normalizePageId(pageId);
  return SUGGESTED_PAGE_SCHEMAS[key] ?? DEFAULT_PAGE_SCHEMA;
}

export const UI_OS_SHADOW_LOG_PREFIX = "[ui-os-shadow]";
