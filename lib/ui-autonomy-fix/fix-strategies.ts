/**
 * UI Autonomy Fix — strategie safe patch per issue del Visual Layout Linter.
 */

import type { LayoutLinterIssue, LayoutRuleId } from "@/lib/ui-visual-linter/layout-rules";
import type { FixRiskLevel } from "@/lib/ui-autonomy-fix/fix-safety-guard";

export type UIFixAction = "add-class" | "normalize-spacing" | "fix-flex" | "align-adjust";

export type UIFix = {
  target: string;
  issue: string;
  rule: LayoutRuleId;
  action: UIFixAction;
  classes: string[];
  safe: boolean;
  risk: FixRiskLevel;
  description: string;
};

function baseFix(issue: LayoutLinterIssue, partial: Omit<UIFix, "target" | "issue" | "rule">): UIFix {
  return {
    target: issue.target,
    issue: issue.message,
    rule: issue.rule,
    ...partial,
  };
}

/** Genera UIFix da issue linter (null se non fixabile). */
export function strategyForIssue(issue: LayoutLinterIssue): UIFix | null {
  switch (issue.rule) {
    case "toolbar-gap":
      return baseFix(issue, {
        action: "normalize-spacing",
        classes: ["gap-2"],
        safe: true,
        risk: "medium",
        description: "toolbar gap normalized to gap-2 (8px)",
      });

    case "toolbar-search-flex":
      return baseFix(issue, {
        action: "fix-flex",
        classes: ["min-w-0", "flex-1"],
        safe: true,
        risk: "low",
        description: "toolbar search flex-1 applied",
      });

    case "toolbar-actions-shrink":
      return baseFix(issue, {
        action: "fix-flex",
        classes: ["shrink-0"],
        safe: true,
        risk: "low",
        description: "toolbar actions shrink-0 applied",
      });

    case "toolbar-alignment":
      return baseFix(issue, {
        action: "align-adjust",
        classes: ["items-center"],
        safe: true,
        risk: "low",
        description: "toolbar alignment normalized to items-center",
      });

    case "flex-min-w-0":
      return baseFix(issue, {
        action: "fix-flex",
        classes: ["min-w-0"],
        safe: true,
        risk: "low",
        description: "flex min-w-0 added",
      });

    case "modal-footer-alignment":
      return baseFix(issue, {
        action: "align-adjust",
        classes: ["justify-end", "items-center", "gap-2"],
        safe: true,
        risk: "low",
        description: "modal footer aligned",
      });

    case "modal-body-padding":
      return baseFix(issue, {
        action: "normalize-spacing",
        classes: ["p-4"],
        safe: true,
        risk: "medium",
        description: "modal body padding normalized",
      });

    case "modal-header-padding":
      return baseFix(issue, {
        action: "normalize-spacing",
        classes: ["py-3", "px-4"],
        safe: true,
        risk: "medium",
        description: "modal header padding normalized",
      });

    /* HIGH — flagged only, no auto-fix */
    case "cross-instance-drift":
    case "table-density":
    case "table-sticky":
    case "flex-justify-between":
    case "flex-alignment-mix":
    case "toolbar-wrap":
      return null;

    case "table-header-padding":
      return baseFix(issue, {
        action: "normalize-spacing",
        classes: ["py-2"],
        safe: true,
        risk: "medium",
        description: "table header padding normalized",
      });

    default:
      return null;
  }
}

export function strategiesForIssues(issues: LayoutLinterIssue[]): UIFix[] {
  const out: UIFix[] = [];
  const seen = new Set<string>();

  for (const issue of issues) {
    const fix = strategyForIssue(issue);
    if (!fix) continue;
    const key = `${fix.rule}::${fix.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(fix);
  }

  return out;
}

/** Enforce flex-safe-row su toolbar row quando manca. */
export function toolbarFlexSafeRowFix(target: string): UIFix {
  return {
    target,
    issue: "toolbar missing flex-safe-row",
    rule: "toolbar-alignment",
    action: "add-class",
    classes: ["flex-safe-row"],
    safe: true,
    risk: "low",
    description: "flex-safe-row enforced on toolbar",
  };
}
