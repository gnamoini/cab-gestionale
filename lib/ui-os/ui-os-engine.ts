/**
 * UI OS Engine — validate, shadow report, contract violations.
 */

import { getContractForSchemaField } from "@/lib/ui-os/ui-contracts";
import {
  diffSchemas,
  enrichDetectedSchema,
  inferPageSchemaFromDom,
  schemaMatchScore,
} from "@/lib/ui-os/ui-migration-layer";
import { resolveUIComponent } from "@/lib/ui-os/ui-resolver";
import {
  getSuggestedSchema,
  type UIPageMode,
  type UIPageSchema,
} from "@/lib/ui-os/ui-schema";
import { runDesignSystemLockOnDom } from "@/lib/ui-design-system-lock/design-system-lock";
import { runVisualLayoutLinter } from "@/lib/ui-visual-linter/visual-layout-linter";

export const UI_OS_SHADOW_LOG_PREFIX = "[ui-os-shadow]";

/**
 * Phase 2 opt-in registry — requires NEXT_PUBLIC_CAB_UI_OS=1.
 */
export const UI_OS_OPT_IN_PAGES: Record<string, UIPageMode> = {
  "/report": "os",
  "/magazzino": "os",
  "/lavorazioni": "os",
};

export function getPageUIMode(pageId: string): UIPageMode {
  const key = pageId.split(":")[0] ?? pageId;
  if (process.env.NEXT_PUBLIC_CAB_UI_OS === "1" && UI_OS_OPT_IN_PAGES[key]) {
    return UI_OS_OPT_IN_PAGES[key];
  }
  return "legacy";
}

export type UISchemaValidationResult = {
  valid: boolean;
  errors: string[];
};

export type UIOsShadowReport = {
  page: string;
  detectedSchema: UIPageSchema;
  suggestedSchema: UIPageSchema;
  driftScore: number;
  layoutScore: number;
  contractViolations: number;
  schemaDelta: string[];
};

export function validateUISchema(schema: UIPageSchema): UISchemaValidationResult {
  const errors: string[] = [];

  if (schema.toolbar) {
    const c = getContractForSchemaField("toolbar", schema.toolbar);
    if (!c) errors.push(`unknown toolbar variant: ${schema.toolbar}`);
  }
  if (schema.table) {
    const c = getContractForSchemaField("table", schema.table);
    if (!c) errors.push(`unknown table variant: ${schema.table}`);
  }
  if (schema.modal) {
    const c = getContractForSchemaField("modal", schema.modal);
    if (!c) errors.push(`unknown modal variant: ${schema.modal}`);
  }
  if (schema.layout) {
    const c = getContractForSchemaField("layout", schema.layout);
    if (!c) errors.push(`unknown layout variant: ${schema.layout}`);
  }

  return { valid: errors.length === 0, errors };
}

export function detectUIContractViolations(schema: UIPageSchema): string[] {
  const issues: string[] = [];
  const validation = validateUISchema(schema);
  issues.push(...validation.errors);

  if (schema.toolbar === "standard" && schema.table === "legacy") {
    issues.push("toolbar standard paired with legacy table — inconsistent shell");
  }

  return issues;
}

export function computeDriftScore(
  layoutScore: number,
  detected: UIPageSchema,
  suggested: UIPageSchema,
): number {
  const match = schemaMatchScore(detected, suggested);
  return Math.round(Math.max(0, Math.min(100, layoutScore * 0.6 + match * 0.4)));
}

/** Build shadow report — DEV only, no DOM mutation. SSR-safe. */
export function buildShadowReport(pageId: string, root: Element | null): UIOsShadowReport {
  const suggestedSchema = getSuggestedSchema(pageId);
  const emptyDetected: UIPageSchema = { ...suggestedSchema };

  if (typeof window === "undefined" || process.env.NODE_ENV !== "development" || !root) {
    return {
      page: pageId,
      detectedSchema: emptyDetected,
      suggestedSchema,
      driftScore: 100,
      layoutScore: 100,
      contractViolations: 0,
      schemaDelta: [],
    };
  }

  const rawDetected = inferPageSchemaFromDom(root, pageId);
  const detectedSchema = enrichDetectedSchema(root, pageId, rawDetected).schema;
  const lint = runVisualLayoutLinter(root, pageId);
  const lockViolations = runDesignSystemLockOnDom(root);
  const schemaDelta = diffSchemas(detectedSchema, suggestedSchema);
  const layoutScore = lint.score.overall;
  const driftScore = computeDriftScore(layoutScore, detectedSchema, suggestedSchema);

  return {
    page: pageId,
    detectedSchema,
    suggestedSchema,
    driftScore,
    layoutScore,
    contractViolations: lockViolations.length,
    schemaDelta,
  };
}

export function emitUIOsShadowReport(report: UIOsShadowReport): void {
  if (process.env.NODE_ENV !== "development") return;

  console.groupCollapsed(
    `${UI_OS_SHADOW_LOG_PREFIX} ${report.page} — drift ${report.driftScore}/100 (layout ${report.layoutScore})`,
  );
  console.log(UI_OS_SHADOW_LOG_PREFIX, {
    page: report.page,
    detectedSchema: report.detectedSchema,
    suggestedSchema: report.suggestedSchema,
    driftScore: report.driftScore,
    layoutScore: report.layoutScore,
    contractViolations: report.contractViolations,
    schemaDelta: report.schemaDelta,
  });
  if (report.schemaDelta.length > 0) {
    console.log("schemaDelta:", report.schemaDelta);
  }
  console.groupEnd();
}

export { resolveUIComponent };
