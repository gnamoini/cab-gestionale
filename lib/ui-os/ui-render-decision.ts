/**
 * UI OS Phase 2 — render decision pipeline + drift gating.
 */

import { validateFlexSystemPolicy } from "@/lib/ui/flex-system-policy";
import {
  buildShadowReport,
  detectUIContractViolations,
  getPageUIMode,
  validateUISchema,
  type UIOsShadowReport,
} from "@/lib/ui-os/ui-os-engine";
import { schemaMatchScore } from "@/lib/ui-os/ui-migration-layer";
import type { UIPageMode, UIPageSchema } from "@/lib/ui-os/ui-schema";

export { validateFlexSystemPolicy, validateFlexSafety } from "@/lib/ui/flex-system-policy";

export const DRIFT_ALLOW_THRESHOLD = 20;
export const DRIFT_BLOCK_THRESHOLD = 40;

export const UI_OS_PHASE2_LOG_PREFIX = "[ui-os-phase-2]";
export const UI_OS_FALLBACK_LOG_PREFIX = "[ui-os-fallback]";

export type UIOsFallbackReason =
  | "env_disabled"
  | "not_opt_in"
  | "mode_legacy"
  | "missing_schema"
  | "invalid_schema"
  | "contract_violation"
  | "flex_unsafe"
  | "drift_blocked"
  | "drift_high"
  | null;

export type UIOsRenderPrimary = "legacy" | "os";

export type UIOsRenderDecision = {
  primary: UIOsRenderPrimary;
  osAllowed: boolean;
  osBlocked: boolean;
  fallbackReason: UIOsFallbackReason;
  schemaMatchScore: number;
  driftScore: number;
  layoutScore: number;
  contractViolations: number;
  shadowReport: UIOsShadowReport;
  pipelineErrors: string[];
};

export function evaluateRenderDecision(input: {
  pageId: string;
  schema: UIPageSchema | undefined;
  mode?: UIPageMode;
  root?: Element | null;
}): UIOsRenderDecision {
  const { pageId, schema, mode, root = null } = input;
  const effectiveMode = mode ?? getPageUIMode(pageId);
  const shadowReport = buildShadowReport(pageId, root ?? null);
  const matchScore = schemaMatchScore(shadowReport.detectedSchema, shadowReport.suggestedSchema);
  const pipelineErrors: string[] = [];

  const base: UIOsRenderDecision = {
    primary: "legacy",
    osAllowed: false,
    osBlocked: false,
    fallbackReason: null,
    schemaMatchScore: matchScore,
    driftScore: shadowReport.driftScore,
    layoutScore: shadowReport.layoutScore,
    contractViolations: shadowReport.contractViolations,
    shadowReport,
    pipelineErrors,
  };

  if (process.env.NEXT_PUBLIC_CAB_UI_OS !== "1") {
    return { ...base, fallbackReason: "env_disabled" };
  }

  if (effectiveMode !== "os") {
    return { ...base, fallbackReason: effectiveMode === "legacy" ? "mode_legacy" : "not_opt_in" };
  }

  if (getPageUIMode(pageId) !== "os") {
    return { ...base, fallbackReason: "not_opt_in" };
  }

  if (!schema) {
    return { ...base, fallbackReason: "missing_schema" };
  }

  const schemaValidation = validateUISchema(schema);
  if (!schemaValidation.valid) {
    pipelineErrors.push(...schemaValidation.errors);
    return { ...base, fallbackReason: "invalid_schema", pipelineErrors };
  }

  const contractIssues = detectUIContractViolations(schema);
  if (contractIssues.length > 0) {
    pipelineErrors.push(...contractIssues);
    return { ...base, fallbackReason: "contract_violation", pipelineErrors };
  }

  const flexCheck = validateFlexSystemPolicy(schema);
  if (!flexCheck.safe) {
    pipelineErrors.push(...flexCheck.errors);
    return { ...base, fallbackReason: "flex_unsafe", pipelineErrors };
  }

  // Flex gate precede drift — driftScore non può bypassare flex containment.

  if (shadowReport.driftScore > DRIFT_BLOCK_THRESHOLD) {
    return {
      ...base,
      osBlocked: true,
      fallbackReason: "drift_blocked",
    };
  }

  if (shadowReport.driftScore > DRIFT_ALLOW_THRESHOLD) {
    return { ...base, fallbackReason: "drift_high" };
  }

  return {
    ...base,
    primary: "os",
    osAllowed: true,
    fallbackReason: null,
  };
}

/** Full validation pipeline — schema → contract → flex → drift gating. */
export function runUIOsValidationPipeline(
  pageId: string,
  schema: UIPageSchema | undefined,
  root?: Element | null,
  mode?: UIPageMode,
): UIOsRenderDecision {
  return evaluateRenderDecision({ pageId, schema, mode, root });
}

export function layoutDriftLevel(driftScore: number): "LOW" | "MEDIUM" | "HIGH" {
  if (driftScore <= DRIFT_ALLOW_THRESHOLD) return "LOW";
  if (driftScore <= DRIFT_BLOCK_THRESHOLD) return "MEDIUM";
  return "HIGH";
}
