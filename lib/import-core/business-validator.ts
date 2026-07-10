import type { BusinessValidationResult, ValidationIssue } from "@/lib/import-core/types";

const BLOCKING_CONFIDENCE_THRESHOLD = 0.55;

export function aggregateBusinessConfidence(issues: ValidationIssue[]): number {
  if (issues.length === 0) return 1;
  let penalty = 0;
  for (const issue of issues) {
    if (issue.severity === "blocking") penalty += 0.35;
    else if (issue.severity === "warning") penalty += 0.15;
    else penalty += 0.05;
  }
  return Math.max(0, Math.min(1, 1 - penalty));
}

export function buildBusinessValidationResult(input: {
  issues: ValidationIssue[];
  aiConfidence?: number;
}): BusinessValidationResult {
  const hasBlocking = input.issues.some((i) => i.severity === "blocking");
  const businessConfidence = aggregateBusinessConfidence(input.issues);

  let status: BusinessValidationResult["status"] = "ok";
  if (hasBlocking || businessConfidence < BLOCKING_CONFIDENCE_THRESHOLD) {
    status = hasBlocking ? "blocked" : "needs_review";
  } else if (input.issues.some((i) => i.severity === "warning")) {
    status = "needs_review";
  }

  return {
    status,
    aiConfidence: input.aiConfidence,
    businessConfidence,
    issues: input.issues,
  };
}

export type BusinessValidator<T> = (input: T) => BusinessValidationResult | Promise<BusinessValidationResult>;

export async function runBusinessValidator<T>(
  validator: BusinessValidator<T>,
  input: T,
  aiConfidence?: number,
): Promise<BusinessValidationResult> {
  const result = await validator(input);
  if (result.aiConfidence == null && aiConfidence != null) {
    return { ...result, aiConfidence };
  }
  return result;
}
