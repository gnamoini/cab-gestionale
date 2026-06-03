/**
 * UI OS — inferenza schema da DOM / source / pathname.
 */

import { VISUAL_LAYOUT_ALLOWLIST } from "@/lib/ui-visual-linter/layout-rules";
import {
  getSuggestedSchema,
  normalizePageId,
  type LayoutVariant,
  type ModalVariant,
  type TableVariant,
  type ToolbarVariant,
  type UIPageSchema,
} from "@/lib/ui-os/ui-schema";

export function isPageAllowlisted(pageId: string): boolean {
  const normalized = pageId.replace(/\\/g, "/");
  if (normalized.includes(":kanban")) return true;
  return VISUAL_LAYOUT_ALLOWLIST.pathnameSubstrings.some((s) => normalized.includes(s));
}

function inferToolbarFromText(text: string): ToolbarVariant {
  if (/PageToolbar|ToolbarGroup|dsPageToolbar/.test(text)) return "standard";
  if (/ToolbarCompact|dense.*toolbar/i.test(text)) return "dense";
  if (/PageHeader/.test(text) && !/PageToolbar/.test(text)) return "legacy";
  return "legacy";
}

function inferTableFromText(text: string): TableVariant {
  if (/GestionaleListTable|globalTableWrap/.test(text)) return "global";
  if (/<table/.test(text) && !/GestionaleListTable/.test(text)) return "legacy";
  return "global";
}

function inferModalFromText(text: string): ModalVariant {
  if (/LavorazioniModalShell|GestionaleModalShell/.test(text)) return "gestionale-shell";
  if (/dsModalPanel|<Modal/.test(text)) return "ds";
  return "legacy";
}

function inferLayoutFromText(text: string, pageId: string): LayoutVariant {
  if (/ReportKpiGrid|report-analytics|ReportControls/.test(text)) return "report-dashboard";
  if (/layoutPageRoot|gestionale-responsive-core|layoutResponsiveCoreScope/.test(text)) {
    return "gestionale-core";
  }
  if (normalizePageId(pageId) === "/report") return "report-dashboard";
  return "gestionale-core";
}

/** Infer schema from file source (static analysis / tests). */
export function inferPageSchemaFromSource(filePath: string, source: string): UIPageSchema {
  if (isPageAllowlisted(filePath)) {
    return getSuggestedSchema(filePath);
  }

  return {
    toolbar: inferToolbarFromText(source),
    table: inferTableFromText(source),
    modal: inferModalFromText(source),
    layout: inferLayoutFromText(source, filePath),
    density: "normal",
  };
}

function htmlContains(root: Element, pattern: RegExp): boolean {
  const html = root.innerHTML ?? "";
  return pattern.test(html);
}

function queryHasClass(root: Element, token: string): boolean {
  return root.querySelector(`[class*="${token}"]`) != null;
}

/** Infer schema from live DOM (DEV shadow mode). */
export function inferPageSchemaFromDom(root: Element, pageId: string): UIPageSchema {
  if (typeof window === "undefined") {
    return getSuggestedSchema(pageId);
  }

  if (isPageAllowlisted(pageId)) {
    return { ...getSuggestedSchema(pageId), toolbar: "legacy", table: "legacy" };
  }

  let toolbar: ToolbarVariant = "legacy";
  if (
    queryHasClass(root, "dsPageToolbar") ||
    htmlContains(root, /PageToolbar|ToolbarGroup/) ||
    htmlContains(root, /flex-safe-row/)
  ) {
    toolbar = "standard";
  } else if (htmlContains(root, /PageHeader/) && !htmlContains(root, /PageToolbar/)) {
    toolbar = "legacy";
  }

  let table: TableVariant = "legacy";
  if (queryHasClass(root, "globalTableWrap") || htmlContains(root, /GestionaleListTable/)) {
    table = "global";
  } else if (root.querySelector("table") && !queryHasClass(root, "globalTableWrap")) {
    table = "legacy";
  }

  let modal: ModalVariant = "legacy";
  if (
    root.querySelector("[data-cab-modal-root]") ||
    htmlContains(root, /LavorazioniModalShell|GestionaleModalShell/)
  ) {
    modal = "gestionale-shell";
  } else if (root.querySelector("[role='dialog']") || htmlContains(root, /dsModalPanel/)) {
    modal = "ds";
  }

  let layout: LayoutVariant = "gestionale-core";
  if (
    queryHasClass(root, "ReportKpiGrid") ||
    htmlContains(root, /ReportKpiGrid|report-kpi|ReportControls/) ||
    normalizePageId(pageId) === "/report"
  ) {
    layout = "report-dashboard";
  } else if (
    htmlContains(root, /layoutPageRoot|gestionale-responsive-core|layoutResponsiveCoreScope/)
  ) {
    layout = "gestionale-core";
  }

  return {
    toolbar,
    table,
    modal,
    layout,
    density: "normal",
  };
}

export function diffSchemas(detected: UIPageSchema, suggested: UIPageSchema): string[] {
  const deltas: string[] = [];
  const fields: (keyof UIPageSchema)[] = ["toolbar", "table", "modal", "layout", "density"];

  for (const field of fields) {
    const d = detected[field];
    const s = suggested[field];
    if (d !== undefined && s !== undefined && d !== s) {
      deltas.push(`${field}: ${d} → ${s}`);
    }
  }

  return deltas;
}

export function schemaMatchScore(detected: UIPageSchema, suggested: UIPageSchema): number {
  const deltas = diffSchemas(detected, suggested);
  return Math.max(0, 100 - deltas.length * 25);
}

export const UI_OS_MIGRATION_LOG_PREFIX = "[ui-os-migration]";

type SchemaField = keyof UIPageSchema;

/** Fill missing schema fields from DOM inference — never overwrites existing values. */
export function enrichDetectedSchema(
  root: Element,
  pageId: string,
  detected: UIPageSchema,
): { schema: UIPageSchema; enriched: string[] } {
  const inferred = inferPageSchemaFromDom(root, pageId);
  const enriched: string[] = [];
  const schema: UIPageSchema = { ...detected };
  const patch: Partial<UIPageSchema> = {};

  const maybeSet = <K extends SchemaField>(field: K, value: UIPageSchema[K] | undefined) => {
    if (schema[field] === undefined && value !== undefined) {
      patch[field] = value;
      enriched.push(`${field}: undefined → ${String(value)}`);
    }
  };

  maybeSet("toolbar", inferred.toolbar);
  maybeSet("table", inferred.table);
  maybeSet("modal", inferred.modal);
  maybeSet("layout", inferred.layout);
  maybeSet("density", inferred.density);

  if (enriched.length > 0 && typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    console.log(UI_OS_MIGRATION_LOG_PREFIX, { page: pageId, enriched });
  }

  return { schema: { ...schema, ...patch }, enriched };
}

/** Readonly hints — does NOT override schema. */
export function suggestSchemaHints(
  detected: UIPageSchema,
  suggested: UIPageSchema,
): readonly string[] {
  return diffSchemas(detected, suggested).map((d) => `hint: consider ${d}`);
}
