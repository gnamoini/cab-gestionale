import type { DigitalDocument } from "@/lib/document-capture/model/document-model";
import type { ValidationIssue } from "@/lib/document-capture/model/validation-result";

export type RuleSeverity = "warning" | "error";

export type RuleContext = {
  document: DigitalDocument;
  field(key: string): string | null;
  hasSection(sectionType: string): boolean;
  namespaceCollision(nsA: string, nsB: string): boolean;
  hasNamespaceRows(ns: string): boolean;
};

export type RuleCondition =
  | { type: "section"; sectionType: string }
  | { type: "fieldMissing"; key: string }
  | { type: "namespaceConflict"; a: string; b: string };

export type ValidationRule = {
  id: string;
  documentType: string;
  conditions: RuleCondition[];
  requireFieldKey?: string;
  severity: RuleSeverity;
  message: string;
};

export function field(ctx: RuleContext, key: string): string | null {
  return ctx.field(key);
}

export function whenSection(sectionType: string): RuleCondition {
  return { type: "section", sectionType };
}

export function requireField(key: string): Pick<ValidationRule, "requireFieldKey"> {
  return { requireFieldKey: key };
}

export function conflicts(nsA: string, nsB: string): RuleCondition {
  return { type: "namespaceConflict", a: nsA, b: nsB };
}

export const severity = {
  warning: "warning" as const,
  error: "error" as const,
};

export function rule(
  id: string,
  documentType: string,
  conditions: RuleCondition[],
  opts: { requireFieldKey?: string; severity: RuleSeverity; message: string },
): ValidationRule {
  return {
    id,
    documentType,
    conditions,
    requireFieldKey: opts.requireFieldKey,
    severity: opts.severity,
    message: opts.message,
  };
}

export function buildRuleContext(document: DigitalDocument): RuleContext {
  const fieldMap = new Map<string, string>();
  for (const page of document.pages) {
    for (const section of page.sections) {
      for (const f of section.fields) {
        if (f.value != null && f.value.trim() !== "") {
          fieldMap.set(f.key, f.value.trim());
        }
      }
    }
  }

  return {
    document,
    field: (key) => fieldMap.get(key) ?? null,
    hasSection: (sectionType) =>
      document.pages.some((p) => p.sections.some((s) => s.sectionType === sectionType)),
    namespaceCollision: (nsA, nsB) => {
      const keysA = [...fieldMap.keys()].filter((k) => k.startsWith(`${nsA}.`));
      const keysB = [...fieldMap.keys()].filter((k) => k.startsWith(`${nsB}.`));
      for (const ka of keysA) {
        const suffix = ka.slice(nsA.length + 1);
        if (keysB.some((kb) => kb.endsWith(suffix) && kb.slice(nsB.length + 1) === suffix)) {
          if (suffix.includes("riga_") && suffix.includes("nome")) return true;
        }
      }
      return false;
    },
    hasNamespaceRows: (ns) => [...fieldMap.keys()].some((k) => k.startsWith(`${ns}.riga_`)),
  };
}

export function evaluateRule(ctx: RuleContext, r: ValidationRule): ValidationIssue | null {
  for (const cond of r.conditions) {
    if (cond.type === "section" && !ctx.hasSection(cond.sectionType)) return null;
    if (cond.type === "fieldMissing" && ctx.field(cond.key)) return null;
    if (cond.type === "namespaceConflict" && !ctx.namespaceCollision(cond.a, cond.b)) return null;
  }
  if (r.requireFieldKey && ctx.field(r.requireFieldKey)) return null;
  if (r.requireFieldKey && !ctx.field(r.requireFieldKey)) {
    return {
      code: r.id,
      message: r.message,
      severity: r.severity,
      fieldRef: { key: r.requireFieldKey },
      ruleId: r.id,
    };
  }
  if (r.conditions.some((c) => c.type === "namespaceConflict")) {
    return {
      code: r.id,
      message: r.message,
      severity: r.severity,
      ruleId: r.id,
    };
  }
  return null;
}
