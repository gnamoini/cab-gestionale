import type { DigitalDocument } from "@/lib/document-capture/model/document-model";
import {
  hashDocumentModelContent,
  hashValidationResultPayload,
} from "@/lib/document-capture/model/document-model-hash";
import type {
  PageTimelineEntry,
  ValidationResult,
  ValidationStatus,
} from "@/lib/document-capture/model/validation-result";
import {
  SCHEDA_OFFICINA_RULE_SET_VERSION,
  VALIDATION_ENGINE_VERSION,
} from "@/lib/document-capture/model/versions";
import {
  buildRuleContext,
  evaluateRule,
  type ValidationRule,
} from "@/lib/document-capture/rules/dsl";
import { schedaOfficinaBundleRules } from "@/lib/document-capture/rules/scheda-officina-bundle";

function buildPageTimeline(doc: DigitalDocument): PageTimelineEntry[] {
  return doc.pages.map((p) => {
    const classification = p.classification?.sectionType ?? "unknown";
    let status: PageTimelineEntry["status"] = "ok";
    if (p.physical.isEmpty) status = "warning";
    if (classification === "unknown" && !p.physical.isEmpty) status = "warning";
    const label = `Pagina ${p.index + 1} — ${classification}`;
    return { pageIndex: p.index, classification, status, label };
  });
}

function resolveStatus(errors: number, warnings: number): ValidationStatus {
  if (errors > 0) return "errors";
  if (warnings > 0) return "warnings";
  return "valid";
}

export function runValidationEngine(
  document: DigitalDocument,
  rules: readonly ValidationRule[] = schedaOfficinaBundleRules,
): ValidationResult {
  const ctx = buildRuleContext(document);
  const errors = [];
  const warnings = [];
  const missingRequiredFields = [];

  for (const r of rules) {
    if (r.documentType !== document.documentType && document.documentType !== "scheda_officina_bundle") {
      continue;
    }
    const issue = evaluateRule(ctx, r);
    if (!issue) continue;
    if (issue.severity === "error") errors.push(issue);
    else warnings.push(issue);
    if (r.requireFieldKey && !ctx.field(r.requireFieldKey)) {
      missingRequiredFields.push({ key: r.requireFieldKey });
    }
  }

  const mixedSchede =
    ctx.hasNamespaceRows("lav") && ctx.hasNamespaceRows("ric") && ctx.namespaceCollision("lav", "ric")
      ? [{ namespaces: ["lav", "ric"], message: "Righe lavorazioni e ricambi in conflitto" }]
      : [];

  const documentModelContentHash = hashDocumentModelContent(document);
  const result: ValidationResult = {
    status: mixedSchede.length > 0 ? "blocked" : resolveStatus(errors.length, warnings.length),
    documentCompleteness: document.completeness,
    metadata: {
      ruleSetVersion: SCHEDA_OFFICINA_RULE_SET_VERSION,
      validationEngineVersion: VALIDATION_ENGINE_VERSION,
      documentModelContentHash,
      generatedAt: new Date().toISOString(),
    },
    errors,
    warnings,
    missingRequiredFields,
    conflictingFields: [],
    pageTimeline: buildPageTimeline(document),
    mixedSchede,
    readyForValidationReview: errors.length === 0,
  };

  void hashValidationResultPayload(result);
  return result;
}
