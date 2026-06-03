/**
 * UI OS — mapping variant → componente React reale (Phase 2).
 */

import type {
  LayoutVariant,
  ModalVariant,
  TableVariant,
  ToolbarVariant,
  UIPageSchema,
} from "@/lib/ui-os/ui-schema";

export type ResolvedUIComponents = {
  toolbar: string | null;
  table: string | null;
  modal: string | null;
  layout: string | null;
};

const TOOLBAR_MAP: Record<ToolbarVariant, string> = {
  standard: "PageToolbar",
  dense: "PageToolbar",
  legacy: "PageHeader",
};

const TABLE_MAP: Record<TableVariant, string> = {
  global: "GestionaleListTable",
  legacy: "table",
};

const MODAL_MAP: Record<ModalVariant, string> = {
  ds: "Modal",
  "gestionale-shell": "LavorazioniModalShell",
  legacy: "dialog",
};

const LAYOUT_MAP: Record<LayoutVariant, string> = {
  "gestionale-core": "layoutPageRoot",
  "report-dashboard": "dsStackPage",
  legacy: "div",
};

export function resolveToolbarComponent(variant: ToolbarVariant): string {
  return TOOLBAR_MAP[variant];
}

export function resolveTableShell(variant: TableVariant): string {
  return TABLE_MAP[variant];
}

export function resolveModalShell(variant: ModalVariant): string {
  return MODAL_MAP[variant];
}

export function resolveLayoutShell(variant: LayoutVariant): string {
  return LAYOUT_MAP[variant];
}

export function resolveUIComponents(schema: UIPageSchema): ResolvedUIComponents {
  return {
    toolbar: schema.toolbar ? resolveToolbarComponent(schema.toolbar) : null,
    table: schema.table ? resolveTableShell(schema.table) : null,
    modal: schema.modal ? resolveModalShell(schema.modal) : null,
    layout: schema.layout ? resolveLayoutShell(schema.layout) : null,
  };
}

export function resolveUIComponent(
  schema: UIPageSchema,
  slot: keyof UIPageSchema,
): string | null {
  switch (slot) {
    case "toolbar":
      return schema.toolbar ? resolveToolbarComponent(schema.toolbar) : null;
    case "table":
      return schema.table ? resolveTableShell(schema.table) : null;
    case "modal":
      return schema.modal ? resolveModalShell(schema.modal) : null;
    case "layout":
      return schema.layout ? resolveLayoutShell(schema.layout) : null;
    default:
      return null;
  }
}
