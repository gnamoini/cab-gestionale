/**
 * Design System Lock — validator statico (tree, className, file content).
 */

import {
  isClassAllowlisted,
  isFileAllowlisted,
  MODAL_CONTRACT,
  TABLE_CONTRACT,
  TOOLBAR_CONTRACT,
  FLEX_CONTRACT,
} from "@/lib/ui-design-system-lock/component-contracts";
import type { DesignSystemRuleId } from "@/lib/ui-design-system-lock/ds-enforcement-rules";
import { DS_ENFORCEMENT_RULES, ruleSeverityScore } from "@/lib/ui-design-system-lock/ds-enforcement-rules";
import {
  FORBIDDEN_PATTERNS,
  PATTERN_MATCHERS,
  patternMatchesFile,
} from "@/lib/ui-design-system-lock/forbidden-patterns";
import { analyzeClassNameForFlexOverflowRisk } from "@/lib/lint/rules/no-flex-overflow-risk";
import { hasFlexContainmentMarker } from "@/lib/ui/global-flex-system";

export type DesignSystemViolation = {
  rule: DesignSystemRuleId;
  message: string;
  severity: "blocker" | "warning";
  file?: string;
  line?: number;
  target?: string;
};

export type ComponentTreeNode = {
  name: string;
  className?: string;
  filePath?: string;
  children?: ComponentTreeNode[];
};

export type ContractValidationResult = {
  valid: boolean;
  violations: DesignSystemViolation[];
  severityScore: number;
};

function violationMessage(rule: DesignSystemRuleId, detail: string): string {
  return `[design-system-lock] violation detected: ${detail}`;
}

/** Valida className string contro contratti flex/toolbar. */
export function validateClassName(
  className: string,
  context?: { filePath?: string; componentName?: string },
): DesignSystemViolation[] {
  if (!className.trim()) return [];
  if (isClassAllowlisted(className)) return [];

  const violations: DesignSystemViolation[] = [];
  const filePath = context?.filePath ?? "";

  if (isFileAllowlisted(filePath)) return [];

  const flexRisk = analyzeClassNameForFlexOverflowRisk(className);
  if (flexRisk?.reason === "flex-grow-without-containment") {
    violations.push({
      rule: "flex-no-containment",
      message: violationMessage("flex-no-containment", flexRisk.message.replace("[flex-system] ", "")),
      severity: "blocker",
      file: filePath,
      target: className.slice(0, 80),
    });
  }

  if (flexRisk?.reason === "toolbar-without-containment") {
    violations.push({
      rule: "toolbar-without-containment",
      message: violationMessage("toolbar-without-containment", "toolbar/search missing containment"),
      severity: "blocker",
      file: filePath,
      target: className.slice(0, 80),
    });
  }

  if (/\bdsStickyToolbar\b/.test(className)) {
    violations.push({
      rule: "toolbar-deprecated",
      message: violationMessage("toolbar-deprecated", "dsStickyToolbar is deprecated"),
      severity: "blocker",
      file: filePath,
    });
  }

  if (/\bsticky\s+top-/.test(className) && /toolbar|Toolbar|PageToolbar/i.test(className + (context?.componentName ?? ""))) {
    violations.push({
      rule: "toolbar-sticky",
      message: violationMessage("toolbar-sticky", "toolbar sticky top-* forbidden"),
      severity: "blocker",
      file: filePath,
    });
  }

  if (className.split(/\s+/).includes("flex-wrap")) {
    const hasScopedWrap = /(?:^|\s)(?:sm|md|lg|xl):flex-wrap/.test(className);
    const hasContainedWrap =
      hasFlexContainmentMarker(className) &&
      (/\bmax-w-full\b|\bmax-w-\[/.test(className) ||
        className.includes("flex-safe-row") ||
        className.includes("flex-safe-col"));
    const isAllowlistedWrap =
      FLEX_CONTRACT.flexWrapAllowlistSubstrings.some(
        (s) => className.includes(s) || filePath.includes(s),
      ) ||
      ["flex-col", "toolbar-group", "dsModalFormFooter", "flex-safe-row", "ToolbarGroup", "PageToolbar"].some(
        (s) => className.includes(s) || filePath.includes(s),
      );
    if (!hasScopedWrap && !isAllowlistedWrap && !hasContainedWrap) {
      violations.push({
        rule: "flex-wrap-unscoped",
        message: violationMessage("flex-wrap-unscoped", "unscoped flex-wrap"),
        severity: "warning",
        file: filePath,
      });
    }
  }

  for (const token of TABLE_CONTRACT.forbiddenTokens) {
    if (className.includes(token)) {
      violations.push({
        rule: token === "prevTableTd" ? "table-prev-token" : "table-deprecated-head",
        message: violationMessage("table-prev-token", `forbidden token ${token}`),
        severity: "blocker",
        file: filePath,
      });
    }
  }

  return violations;
}

function validateComponentNode(node: ComponentTreeNode): DesignSystemViolation[] {
  const violations: DesignSystemViolation[] = [];
  const filePath = node.filePath ?? "";

  if (node.className) {
    violations.push(
      ...validateClassName(node.className, { filePath, componentName: node.name }),
    );
  }

  if (node.name === "ToolbarGroupPrimaryRow" || node.name === "ToolbarGroupMetaRow") {
    if (node.className && !node.className.includes(TOOLBAR_CONTRACT.rowToken)) {
      violations.push({
        rule: "toolbar-missing-flex-safe-row",
        message: violationMessage("toolbar-missing-flex-safe-row", `${node.name} missing flex-safe-row`),
        severity: "warning",
        file: filePath,
        target: node.name,
      });
    }
  }

  if (node.name === "Modal" && node.className) {
    const hasPanel = MODAL_CONTRACT.panelTokens.some((t) => node.className!.includes(t));
    if (!hasPanel && !node.className.includes("flex-safe-col")) {
      violations.push({
        rule: "modal-custom-shell",
        message: violationMessage("modal-custom-shell", "Modal missing dsModalPanel token"),
        severity: "warning",
        file: filePath,
      });
    }
  }

  if (node.name === "table" && node.className?.includes("text-sm")) {
    if (!isFileAllowlisted(filePath)) {
      violations.push({
        rule: "table-text-sm",
        message: violationMessage("table-text-sm", "table text-sm in dense list"),
        severity: "warning",
        file: filePath,
      });
    }
  }

  for (const child of node.children ?? []) {
    violations.push(...validateComponentNode(child));
  }

  return violations;
}

export function validateComponentTree(tree: ComponentTreeNode): ContractValidationResult {
  const violations = dedupeViolations(validateComponentNode(tree));
  const penalty = violations.reduce(
    (sum, v) => sum + ruleSeverityScore(DS_ENFORCEMENT_RULES[v.rule]?.severity ?? "warning"),
    0,
  );
  const severityScore = Math.max(0, Math.min(100, 100 - penalty));

  return {
    valid: violations.length === 0,
    violations,
    severityScore,
  };
}

/** Scan file content line-by-line. */
export function validateFileContent(filePath: string, content: string): DesignSystemViolation[] {
  if (isFileAllowlisted(filePath)) return [];

  const violations: DesignSystemViolation[] = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (!patternMatchesFile(pattern, filePath)) continue;

      const matcher = PATTERN_MATCHERS[pattern.id];
      if (!matcher?.testLine(line)) continue;

      if (pattern.id === "flex-no-containment") {
        const classMatch = line.match(/className=["'{`]([^"'`]+)/);
        if (classMatch) {
          const clsViolations = validateClassName(classMatch[1], { filePath });
          if (clsViolations.some((v) => v.rule === "flex-no-containment")) {
            violations.push({
              rule: pattern.id,
              message: violationMessage(pattern.id, pattern.message),
              severity: pattern.severity,
              file: filePath,
              line: lineNum,
            });
          }
          continue;
        }
      }

      violations.push({
        rule: pattern.id,
        message: violationMessage(pattern.id, pattern.message),
        severity: pattern.severity,
        file: filePath,
        line: lineNum,
      });
    }

    const classMatches = line.matchAll(/className=["'{`]([^"'`$]+)/g);
    for (const m of classMatches) {
      violations.push(...validateClassName(m[1], { filePath }).map((v) => ({ ...v, line: lineNum })));
    }
  });

  return dedupeViolations(violations);
}

export function dedupeViolations(violations: DesignSystemViolation[]): DesignSystemViolation[] {
  const seen = new Set<string>();
  const out: DesignSystemViolation[] = [];
  for (const v of violations) {
    const key = `${v.rule}::${v.file ?? ""}::${v.line ?? 0}::${v.target ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

export function violationFingerprint(v: DesignSystemViolation): string {
  return `${v.file ?? ""}:${v.line ?? 0}:${v.rule}`;
}
