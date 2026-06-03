/**
 * UI OS Phase 2 — structural compare + DEV observability.
 */

import { enrichDetectedSchema, suggestSchemaHints } from "@/lib/ui-os/ui-migration-layer";
import {
  layoutDriftLevel,
  UI_OS_PHASE2_LOG_PREFIX,
  type UIOsRenderDecision,
} from "@/lib/ui-os/ui-render-decision";
import { resolveUIComponents } from "@/lib/ui-os/ui-resolver";
import type { UIPageSchema } from "@/lib/ui-os/ui-schema";

export type UIOsPhase2CompareReport = {
  page: string;
  legacyRender: "OK" | "FALLBACK";
  osRender: "OK" | "BLOCKED";
  diffScore: number;
  layoutDrift: "LOW" | "MEDIUM" | "HIGH";
  schemaMatchScore: number;
  driftScore: number;
  layoutScore: number;
  contractViolations: number;
  fallbackReason: UIOsRenderDecision["fallbackReason"];
  hints: readonly string[];
  resolverPlan: ReturnType<typeof resolveUIComponents>;
};

export function buildPhase2CompareReport(
  pageId: string,
  schema: UIPageSchema,
  decision: UIOsRenderDecision,
  root: Element | null,
): UIOsPhase2CompareReport {
  let detected = decision.shadowReport.detectedSchema;
  if (root) {
    detected = enrichDetectedSchema(root, pageId, detected).schema;
  }

  const hints = suggestSchemaHints(detected, decision.shadowReport.suggestedSchema);
  const resolverPlan = resolveUIComponents(schema);

  return {
    page: pageId,
    legacyRender: decision.primary === "os" ? "FALLBACK" : "OK",
    osRender: decision.osBlocked ? "BLOCKED" : decision.primary === "os" ? "OK" : "BLOCKED",
    diffScore: 100 - decision.schemaMatchScore,
    layoutDrift: layoutDriftLevel(decision.driftScore),
    schemaMatchScore: decision.schemaMatchScore,
    driftScore: decision.driftScore,
    layoutScore: decision.layoutScore,
    contractViolations: decision.contractViolations,
    fallbackReason: decision.fallbackReason,
    hints,
    resolverPlan,
  };
}

export function emitPhase2CompareReport(report: UIOsPhase2CompareReport): void {
  if (process.env.NODE_ENV !== "development") return;

  console.groupCollapsed(
    `${UI_OS_PHASE2_LOG_PREFIX} ${report.page} — drift ${report.driftScore} (${report.layoutDrift})`,
  );
  console.log(UI_OS_PHASE2_LOG_PREFIX, {
    page: report.page,
    "legacy-render": report.legacyRender,
    "os-render": report.osRender,
    "diff-score": report.diffScore,
    "layout-drift": report.layoutDrift,
    schemaMatchScore: report.schemaMatchScore,
    driftScore: report.driftScore,
    layoutScore: report.layoutScore,
    contractViolations: report.contractViolations,
    fallbackReason: report.fallbackReason,
    resolverPlan: report.resolverPlan,
  });
  if (report.hints.length > 0) {
    console.log("schemaHints:", report.hints);
  }
  console.groupEnd();
}
