import fs from "node:fs";
import path from "node:path";
import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import { resolveMapVersionContext } from "@/lib/form-ux-migration/form-ux-map-versioning";
import { FORM_UX_ROLLOUT } from "@/lib/form-ux-migration/rollout-config";
import type {
  FormUxEnforcementLevel,
  FormUxFormId,
} from "@/lib/form-ux-migration/types";

export type MigrationRiskTier = 0 | 1 | 2 | 3;
export type MigrationTierBand = "0" | "0B" | "1" | "2" | "3";
export type MigrationTierLabel = "safe" | "moderate" | "high" | "critical";
export type CodemodDisposition = "SAFE_AUTO" | "REVIEW_REQUIRED" | "BLOCKED";

export type MigrationSignal =
  | "rollout_critical_flag"
  | "critical_keyword"
  | "critical_domain_path"
  | "cross_field_sync"
  | "submit_transform"
  | "persistence_side_effect"
  | "onBlur_submit_side_effect"
  | "business_handler_on_typed_input"
  | "onChange_controlled"
  | "onBlur_local"
  | "validation_ui_only"
  | "helper_or_error_text"
  | "formatting_visual"
  | "debounce_local"
  | "local_derived_state";

export type FormUxClassificationResult = {
  fieldKey: string;
  formId: FormUxFormId | null;
  fieldId: string;
  tier: MigrationRiskTier;
  tierBand: MigrationTierBand;
  tierLabel: MigrationTierLabel;
  signals: MigrationSignal[];
  hardSignals: MigrationSignal[];
  softSignals: MigrationSignal[];
  tier0ConfidenceScore: number;
  recalibrationReasons: string[];
  isRecalibratedTier0: boolean;
  codemodDisposition: CodemodDisposition;
  suggestedInitialMode: "shadow" | "ssot";
  suggestedEnforcement: FormUxEnforcementLevel;
  status: MigrationInventoryField["status"];
  file: string;
  line: number;
  kind: MigrationInventoryField["kind"];
  mapVersion: number;
  classifierSchemaVersion: string;
};

const HARD_SIGNALS = new Set<MigrationSignal>([
  "rollout_critical_flag",
  "critical_keyword",
  "cross_field_sync",
  "submit_transform",
  "persistence_side_effect",
  "onBlur_submit_side_effect",
  "business_handler_on_typed_input",
]);

const SOFT_SIGNALS = new Set<MigrationSignal>([
  "onChange_controlled",
  "onBlur_local",
  "validation_ui_only",
  "helper_or_error_text",
  "formatting_visual",
  "debounce_local",
  "local_derived_state",
  "critical_domain_path",
]);

const CRITICAL_KEYWORDS =
  /\b(prezzo|sconto|markup|stock|quantit|magazzino|preventiv|assign|rollback|kanban)\b/i;

const PRICE_KEYWORDS = /\b(prezzo|sconto|markup|stock|quantit)\b/i;

const PERSISTENCE_PATTERN =
  /\b(localStorage|sessionStorage|mutate\(|fetch\(|supabase|api\.|persist|saveTo)/i;

const SUBMIT_BLUR_PATTERN = /\bonBlur[\s\S]{0,120}\b(submit|save|persist|mutate|fetch)\b/i;

const TIER_LABELS: Record<MigrationRiskTier, MigrationTierLabel> = {
  0: "safe",
  1: "moderate",
  2: "high",
  3: "critical",
};

const TIER0B_CONFIDENCE_THRESHOLD = 0.65;

const TIER3_HARD_SIGNALS = new Set<MigrationSignal>([
  "rollout_critical_flag",
  "critical_keyword",
  "cross_field_sync",
  "submit_transform",
  "persistence_side_effect",
]);

function readFileContext(file: string, line: number, root: string): string {
  if (file === "rollout-config.ts" || line <= 0) return "";
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) return "";
  const lines = fs.readFileSync(abs, "utf8").split("\n");
  const start = Math.max(0, line - 7);
  const end = Math.min(lines.length, line + 6);
  return lines.slice(start, end).join("\n");
}

export function collectClassificationSignals(
  field: MigrationInventoryField,
  context: string,
): MigrationSignal[] {
  const signals: MigrationSignal[] = [];
  const blob = `${field.snippet}\n${context}`;

  if (field.formId != null && FORM_UX_ROLLOUT[field.formId]?.fields[field.fieldId]?.critical) {
    signals.push("rollout_critical_flag");
  }

  if (/magazzino|ricambio-form|preventiv/i.test(field.file)) {
    signals.push("critical_domain_path");
  }

  if (PRICE_KEYWORDS.test(blob) || PRICE_KEYWORDS.test(field.fieldId)) {
    signals.push("critical_keyword");
  } else if (CRITICAL_KEYWORDS.test(blob)) {
    signals.push("critical_keyword");
  }

  if (/useEffect/.test(blob) && /\bset[A-Z]/.test(blob)) {
    signals.push("cross_field_sync");
  }

  if (/resolveFormSubmitPayload|stateKey/.test(blob)) {
    signals.push("submit_transform");
  }

  if (PERSISTENCE_PATTERN.test(blob)) {
    signals.push("persistence_side_effect");
  }

  if (/\bonBlur\b/.test(blob)) {
    if (SUBMIT_BLUR_PATTERN.test(blob)) {
      signals.push("onBlur_submit_side_effect");
    } else {
      signals.push("onBlur_local");
    }
  }

  if (/\bonChange\b/.test(blob) && field.kind !== "checkbox") {
    signals.push("onChange_controlled");
  }

  if (/\b(required|pattern|min=|max=)\b/.test(blob)) {
    signals.push("validation_ui_only");
  }

  if (/helper|error|invalid|aria-invalid/i.test(blob)) {
    signals.push("helper_or_error_text");
  }

  if (/className=|inputMode=|placeholder=/i.test(blob)) {
    signals.push("formatting_visual");
  }

  if (/debounce|useDebounced|useDeferredValue/i.test(blob)) {
    signals.push("debounce_local");
  }

  if (/useMemo/.test(blob) && !/useEffect/.test(blob)) {
    signals.push("local_derived_state");
  }

  if (
    (field.kind === "number" || field.kind === "select") &&
    /\bonChange\b/.test(blob) &&
    !signals.includes("onChange_controlled")
  ) {
    signals.push("business_handler_on_typed_input");
  }

  return [...new Set(signals)];
}

function partitionSignals(signals: MigrationSignal[]): {
  hardSignals: MigrationSignal[];
  softSignals: MigrationSignal[];
} {
  return {
    hardSignals: signals.filter((s) => HARD_SIGNALS.has(s)),
    softSignals: signals.filter((s) => SOFT_SIGNALS.has(s)),
  };
}

export function computeClassificationConfidence(input: {
  hardSignals: MigrationSignal[];
  softSignals: MigrationSignal[];
  kind: MigrationInventoryField["kind"];
}): number {
  let score = 1.0;
  score -= 0.12 * input.softSignals.length;
  score -= 0.4 * input.hardSignals.length;
  if (input.kind === "number") score -= 0.08;
  if (input.softSignals.includes("critical_domain_path")) score -= 0.05;
  return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}

function hasHardCriticalDomainNumeric(
  field: MigrationInventoryField,
  signals: MigrationSignal[],
): boolean {
  return (
    signals.includes("critical_domain_path") &&
    (field.kind === "number" || field.kind === "select")
  );
}

function resolveLegacyTier(field: MigrationInventoryField, signals: MigrationSignal[]): MigrationRiskTier {
  if (
    signals.includes("rollout_critical_flag") ||
    signals.includes("critical_keyword") ||
    hasHardCriticalDomainNumeric(field, signals)
  ) {
    return 3;
  }

  if (
    signals.includes("onBlur_submit_side_effect") ||
    signals.includes("cross_field_sync") ||
    signals.includes("submit_transform") ||
    signals.includes("persistence_side_effect") ||
    signals.includes("business_handler_on_typed_input")
  ) {
    return 2;
  }

  if (
    signals.includes("onChange_controlled") ||
    signals.includes("onBlur_local") ||
    signals.includes("validation_ui_only") ||
    signals.includes("helper_or_error_text") ||
    signals.includes("formatting_visual") ||
    signals.includes("debounce_local") ||
    signals.includes("local_derived_state") ||
    signals.includes("critical_domain_path")
  ) {
    return 1;
  }

  const safeKinds = new Set(["text", "textarea", "checkbox"]);
  if (safeKinds.has(field.kind)) return 0;

  if (field.kind === "number" || field.kind === "select") return 2;

  return 1;
}

function resolveTierBand(input: {
  field: MigrationInventoryField;
  signals: MigrationSignal[];
  hardSignals: MigrationSignal[];
  softSignals: MigrationSignal[];
  confidence: number;
  legacyTier: MigrationRiskTier;
}): { tierBand: MigrationTierBand; recalibrationReasons: string[] } {
  const recalibrationReasons: string[] = [];

  const tier3Hard = input.hardSignals.filter((s) => TIER3_HARD_SIGNALS.has(s));
  const hasHardCriticalNumeric = hasHardCriticalDomainNumeric(input.field, input.signals);

  if (tier3Hard.length > 0 || hasHardCriticalNumeric) {
    return { tierBand: "3", recalibrationReasons };
  }

  if (
    input.signals.includes("onBlur_submit_side_effect") ||
    input.signals.includes("business_handler_on_typed_input")
  ) {
    return { tierBand: "2", recalibrationReasons };
  }

  const safeKinds = new Set(["text", "textarea", "checkbox", "number"]);
  const isSearch = /type=["']search["']/.test(`${input.field.snippet}`);

  if (
    input.softSignals.length === 0 &&
    input.hardSignals.length === 0 &&
    (safeKinds.has(input.field.kind) || isSearch)
  ) {
    return { tierBand: "0", recalibrationReasons };
  }

  if (
    input.softSignals.length > 0 &&
    input.hardSignals.length === 0 &&
    input.confidence >= TIER0B_CONFIDENCE_THRESHOLD &&
    !hasHardCriticalDomainNumeric(input.field, input.signals)
  ) {
    recalibrationReasons.push("soft_signals_only");
    recalibrationReasons.push(`confidence_${input.confidence}`);
    return { tierBand: "0B", recalibrationReasons };
  }

  if (input.legacyTier === 2) return { tierBand: "2", recalibrationReasons };
  return { tierBand: "1", recalibrationReasons };
}

function tierBandToNumericTier(tierBand: MigrationTierBand): MigrationRiskTier {
  if (tierBand === "0" || tierBand === "0B") return 0;
  if (tierBand === "1") return 1;
  if (tierBand === "2") return 2;
  return 3;
}

function resolveCodemodDisposition(
  field: MigrationInventoryField,
  tierBand: MigrationTierBand,
): CodemodDisposition {
  if (tierBand === "3" || field.formId == null || field.fieldId.startsWith("field-")) {
    return "BLOCKED";
  }
  if (tierBand === "0" || tierBand === "0B") {
    if (field.kind === "number" || field.kind === "text" || field.kind === "textarea") {
      return "SAFE_AUTO";
    }
    if (field.kind === "checkbox") return "SAFE_AUTO";
  }
  if (tierBand === "1" || tierBand === "2") return "REVIEW_REQUIRED";
  return "BLOCKED";
}

/** Pure classification — no drift, locks, or snapshot history. */
export function classifyFormUxField(
  field: MigrationInventoryField,
  options?: { root?: string },
): FormUxClassificationResult {
  const root = options?.root ?? process.cwd();
  const context = readFileContext(field.file, field.line, root);
  const signals = collectClassificationSignals(field, context);
  const { hardSignals, softSignals } = partitionSignals(signals);
  const legacyTier = resolveLegacyTier(field, signals);
  const tier0ConfidenceScore = computeClassificationConfidence({
    hardSignals,
    softSignals,
    kind: field.kind,
  });
  const { tierBand, recalibrationReasons } = resolveTierBand({
    field,
    signals,
    hardSignals,
    softSignals,
    confidence: tier0ConfidenceScore,
    legacyTier,
  });
  const tier = tierBandToNumericTier(tierBand);
  const codemodDisposition = resolveCodemodDisposition(field, tierBand);

  const suggestedInitialMode: "shadow" | "ssot" =
    tierBand === "0" || tierBand === "0B" ? "ssot" : "shadow";
  const suggestedEnforcement: FormUxEnforcementLevel =
    tier >= 2 ? "warn" : tier === 1 ? "warn" : "off";

  const versionContext = resolveMapVersionContext();

  return {
    fieldKey: field.fieldKey,
    formId: field.formId,
    fieldId: field.fieldId,
    tier,
    tierBand,
    tierLabel: TIER_LABELS[tier],
    signals,
    hardSignals,
    softSignals,
    tier0ConfidenceScore,
    recalibrationReasons,
    isRecalibratedTier0: tierBand === "0B",
    codemodDisposition,
    suggestedInitialMode,
    suggestedEnforcement,
    status: field.status,
    file: field.file,
    line: field.line,
    kind: field.kind,
    mapVersion: versionContext.mapVersion,
    classifierSchemaVersion: versionContext.classifierSchemaVersion,
  };
}

export function classifyAllFormUxFields(
  inventory: MigrationInventoryField[],
  options?: { root?: string },
): FormUxClassificationResult[] {
  return inventory.map((field) => classifyFormUxField(field, options));
}
