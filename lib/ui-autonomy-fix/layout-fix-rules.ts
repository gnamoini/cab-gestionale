/**
 * UI Autonomy Fix — mapping regole linter → fixability + risk tier.
 */

import type { LayoutLinterIssue, LayoutRuleId } from "@/lib/ui-visual-linter/layout-rules";
import type { FixRiskLevel } from "@/lib/ui-autonomy-fix/fix-safety-guard";

export type RuleFixPolicy = {
  fixable: boolean;
  risk: FixRiskLevel;
  autoApply: boolean;
};

export const LAYOUT_FIX_POLICIES: Record<LayoutRuleId, RuleFixPolicy> = {
  "toolbar-gap": { fixable: true, risk: "medium", autoApply: true },
  "toolbar-search-flex": { fixable: true, risk: "low", autoApply: true },
  "toolbar-actions-shrink": { fixable: true, risk: "low", autoApply: true },
  "toolbar-alignment": { fixable: true, risk: "low", autoApply: true },
  "toolbar-wrap": { fixable: false, risk: "high", autoApply: false },
  "table-density": { fixable: false, risk: "high", autoApply: false },
  "table-header-padding": { fixable: true, risk: "medium", autoApply: true },
  "table-sticky": { fixable: false, risk: "high", autoApply: false },
  "modal-header-padding": { fixable: true, risk: "medium", autoApply: true },
  "modal-body-padding": { fixable: true, risk: "medium", autoApply: true },
  "modal-footer-alignment": { fixable: true, risk: "low", autoApply: true },
  "flex-justify-between": { fixable: false, risk: "high", autoApply: false },
  "flex-alignment-mix": { fixable: false, risk: "high", autoApply: false },
  "flex-min-w-0": { fixable: true, risk: "low", autoApply: true },
  "cross-instance-drift": { fixable: false, risk: "high", autoApply: false },
};

export function isIssueAutoFixable(issue: LayoutLinterIssue): boolean {
  const policy = LAYOUT_FIX_POLICIES[issue.rule];
  return policy?.fixable === true && policy.autoApply && policy.risk !== "high";
}

export function partitionIssues(issues: LayoutLinterIssue[]): {
  fixable: LayoutLinterIssue[];
  flagged: LayoutLinterIssue[];
} {
  const fixable: LayoutLinterIssue[] = [];
  const flagged: LayoutLinterIssue[] = [];

  for (const issue of issues) {
    if (isIssueAutoFixable(issue)) {
      fixable.push(issue);
    } else {
      flagged.push(issue);
    }
  }

  return { fixable, flagged };
}

export function issueRiskLevel(rule: LayoutRuleId): FixRiskLevel {
  return LAYOUT_FIX_POLICIES[rule]?.risk ?? "high";
}
