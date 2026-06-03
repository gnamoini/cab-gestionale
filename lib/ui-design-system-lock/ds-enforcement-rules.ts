/**
 * Design System Lock — rule ids, severity, enforcement policy.
 */

export type DesignSystemRuleId =
  | "flex-no-containment"
  | "toolbar-sticky"
  | "toolbar-deprecated"
  | "toolbar-missing-flex-safe-row"
  | "toolbar-without-containment"
  | "table-prev-token"
  | "table-deprecated-head"
  | "table-text-sm"
  | "table-padding-override"
  | "modal-custom-shell"
  | "modal-footer-alignment"
  | "flex-wrap-unscoped";

export type EnforcementSeverity = "blocker" | "warning";

export type RulePolicy = {
  id: DesignSystemRuleId;
  severity: EnforcementSeverity;
  autoFixable: boolean;
  contract: "toolbar" | "table" | "modal" | "flex";
};

export const DS_ENFORCEMENT_RULES: Record<DesignSystemRuleId, RulePolicy> = {
  "flex-no-containment": { id: "flex-no-containment", severity: "blocker", autoFixable: false, contract: "flex" },
  "toolbar-sticky": { id: "toolbar-sticky", severity: "blocker", autoFixable: false, contract: "toolbar" },
  "toolbar-deprecated": { id: "toolbar-deprecated", severity: "blocker", autoFixable: false, contract: "toolbar" },
  "toolbar-missing-flex-safe-row": {
    id: "toolbar-missing-flex-safe-row",
    severity: "warning",
    autoFixable: false,
    contract: "toolbar",
  },
  "toolbar-without-containment": {
    id: "toolbar-without-containment",
    severity: "blocker",
    autoFixable: false,
    contract: "toolbar",
  },
  "table-prev-token": { id: "table-prev-token", severity: "blocker", autoFixable: false, contract: "table" },
  "table-deprecated-head": { id: "table-deprecated-head", severity: "blocker", autoFixable: false, contract: "table" },
  "table-text-sm": { id: "table-text-sm", severity: "warning", autoFixable: false, contract: "table" },
  "table-padding-override": { id: "table-padding-override", severity: "warning", autoFixable: false, contract: "table" },
  "modal-custom-shell": { id: "modal-custom-shell", severity: "warning", autoFixable: false, contract: "modal" },
  "modal-footer-alignment": { id: "modal-footer-alignment", severity: "warning", autoFixable: false, contract: "modal" },
  "flex-wrap-unscoped": { id: "flex-wrap-unscoped", severity: "warning", autoFixable: false, contract: "flex" },
};

export function ruleSeverityScore(severity: EnforcementSeverity): number {
  return severity === "blocker" ? 18 : 4;
}
