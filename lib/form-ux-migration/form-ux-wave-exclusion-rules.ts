import fs from "node:fs";
import path from "node:path";
import type { FormUxClassificationResult } from "@/lib/form-ux-migration/form-ux-classification-engine";
import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import type { FormUxInputKind } from "@/lib/form-ux-migration/types";

const PRICE_PATTERN = /\b(prezzo|sconto|markup)\b/i;
const FORMATTER_PATTERN = /\b(format|formatter|mask|decimal|currency)\b/i;

const EXCLUSION_SIGNALS = new Set([
  "critical_keyword",
  "cross_field_sync",
  "submit_transform",
  "persistence_side_effect",
  "onBlur_submit_side_effect",
  "business_handler_on_typed_input",
  "rollout_critical_flag",
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

export type WaveExclusionResult = {
  excluded: boolean;
  reasons: string[];
};

export function getWaveExclusionReasons(
  field: MigrationInventoryField,
  classification: Pick<FormUxClassificationResult, "signals">,
  options?: { root?: string },
): WaveExclusionResult {
  const root = options?.root ?? process.cwd();
  const context = readFileContext(field.file, field.line, root);
  const blob = `${field.snippet}\n${field.fieldId}\n${context}`;
  const reasons: string[] = [];

  for (const signal of classification.signals) {
    if (EXCLUSION_SIGNALS.has(signal)) {
      reasons.push(signal);
    }
    if (signal === "critical_domain_path" && field.kind === "number") {
      reasons.push("critical_domain_path_numeric");
    }
  }

  if (PRICE_PATTERN.test(blob)) reasons.push("price_field");
  if (FORMATTER_PATTERN.test(blob)) reasons.push("formatter_detected");

  const allowedKinds = new Set<FormUxInputKind>(["text", "textarea", "checkbox", "number"]);
  const isSearch = /type=["']search["']/.test(blob);
  if (!allowedKinds.has(field.kind) && !isSearch) {
    reasons.push("unsupported_kind");
  }

  if (field.kind === "number" && reasons.length > 0) {
    reasons.push("complex_numeric");
  }

  return { excluded: reasons.length > 0, reasons };
}
