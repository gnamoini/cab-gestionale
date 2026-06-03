/**
 * Design System Lock — orchestratore, baseline, emit DEV.
 */

import { DS_LOCK_MESSAGE_PREFIX } from "@/lib/ui-design-system-lock/component-contracts";
import {
  dedupeViolations,
  type ContractValidationResult,
  type DesignSystemViolation,
  validateClassName,
  validateComponentTree,
  validateFileContent,
  violationFingerprint,
  type ComponentTreeNode,
} from "@/lib/ui-design-system-lock/layout-contract-validator";
import baselineData from "@/lib/ui-design-system-lock/ds-lock-baseline.json";

export const DS_LOCK_MESSAGE = `${DS_LOCK_MESSAGE_PREFIX} violation detected:`;

export type BaselineEntry = {
  file: string;
  line: number;
  rule: string;
};

export type BaselineFile = {
  version: number;
  entries: BaselineEntry[];
};

const baseline = baselineData as BaselineFile;

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

export function isInBaseline(violation: DesignSystemViolation): boolean {
  if (process.env.CAB_DS_LOCK_STRICT === "1") return false;

  const file = normalizePath(violation.file ?? "");
  const line = violation.line ?? 0;
  const rule = violation.rule;

  return baseline.entries.some(
    (e) => normalizePath(e.file) === file && e.line === line && e.rule === rule,
  );
}

export function filterNonBaselineViolations(violations: DesignSystemViolation[]): DesignSystemViolation[] {
  return violations.filter((v) => !isInBaseline(v));
}

export function getBaselineEntries(): BaselineEntry[] {
  return [...baseline.entries];
}

export function runDesignSystemLockOnFile(filePath: string, content: string): DesignSystemViolation[] {
  return filterNonBaselineViolations(validateFileContent(filePath, content));
}

export function runDesignSystemLockOnTree(tree: ComponentTreeNode): ContractValidationResult {
  const result = validateComponentTree(tree);
  const filtered = filterNonBaselineViolations(result.violations);
  const penalty = filtered.length * 8;
  return {
    valid: filtered.length === 0,
    violations: filtered,
    severityScore: Math.max(0, 100 - penalty),
  };
}

/** DEV runtime — scan DOM classNames (warn only, no mutation). */
export function runDesignSystemLockOnDom(root: Element | null): DesignSystemViolation[] {
  if (typeof window === "undefined" || !root || process.env.NODE_ENV !== "development") {
    return [];
  }

  const violations: DesignSystemViolation[] = [];
  const walk = root.querySelectorAll("[class]");

  for (const el of walk) {
    if (!(el instanceof HTMLElement)) continue;
    const cn = typeof el.className === "string" ? el.className : "";
    if (!cn) continue;
    violations.push(
      ...validateClassName(cn, { componentName: el.tagName.toLowerCase() }).map((v) => ({
        ...v,
        target: `${el.tagName.toLowerCase()}.${cn.split(/\s+/).slice(0, 2).join(".")}`,
      })),
    );
  }

  return filterNonBaselineViolations(dedupeViolations(violations)).slice(0, 15);
}

export function emitDesignSystemLockWarnings(
  violations: DesignSystemViolation[],
  pageId: string,
): void {
  if (process.env.NODE_ENV !== "development") return;
  if (violations.length === 0) return;

  console.groupCollapsed(
    `${DS_LOCK_MESSAGE_PREFIX} ${pageId} — ${violations.length} violation(s) (non-baseline)`,
  );
  console.log(`${DS_LOCK_MESSAGE_PREFIX}`);
  for (const v of violations) {
    console.warn(`  - ${v.message.replace(DS_LOCK_MESSAGE_PREFIX, "").trim()} @ ${v.file ?? v.target ?? pageId}${v.line ? `:${v.line}` : ""}`);
  }
  console.groupEnd();
}

export { validateComponentTree, validateClassName, validateFileContent, violationFingerprint };
export type { ComponentTreeNode, ContractValidationResult, DesignSystemViolation };
