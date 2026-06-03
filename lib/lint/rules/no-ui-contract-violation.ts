/**
 * Design System Lock — ESLint analyzer (TS SSOT).
 */
import { isFileAllowlisted } from "@/lib/ui-design-system-lock/component-contracts";
import { isInBaseline } from "@/lib/ui-design-system-lock/design-system-lock";
import {
  validateClassName,
  validateFileContent,
  type DesignSystemViolation,
} from "@/lib/ui-design-system-lock/layout-contract-validator";

export const DS_LOCK_LINT_MESSAGE = "[design-system-lock] violation detected";

export type UIContractViolation = {
  rule: string;
  message: string;
  line?: number;
};

export function analyzeClassNameForUIContractViolation(
  className: string,
  filePath?: string,
): UIContractViolation | null {
  if (filePath && isFileAllowlisted(filePath)) return null;

  const violations = validateClassName(className, { filePath });
  const active = violations.filter((v) => !isInBaseline({ ...v, file: filePath }));

  if (active.length === 0) return null;

  const first = active[0];
  return {
    rule: first.rule,
    message: `${DS_LOCK_LINT_MESSAGE}: ${first.message.replace(/\[design-system-lock\]\s*violation detected:\s*/i, "")}`,
  };
}

export function analyzeFileForUIContractViolations(
  filePath: string,
  content: string,
): UIContractViolation[] {
  if (isFileAllowlisted(filePath)) return [];

  return validateFileContent(filePath, content)
    .filter((v) => !isInBaseline(v))
    .map((v) => ({
      rule: v.rule,
      message: `${DS_LOCK_LINT_MESSAGE}: ${v.message.replace(/\[design-system-lock\]\s*violation detected:\s*/i, "")}`,
      line: v.line,
    }));
}

export function violationsToFingerprint(v: DesignSystemViolation): string {
  return `${v.file}:${v.line}:${v.rule}`;
}
