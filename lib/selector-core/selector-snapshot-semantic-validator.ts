/**
 * @advisory v5.3.2 — cross-version semantic validation (logic-level, not schema-only).
 */
import { diffRuntimeSnapshots } from "@/lib/selector-core/selector-config-snapshot";
import type { SelectorRuntimeSnapshot } from "@/lib/selector-core/types";

const ROLLOUT_RANK: Record<string, number> = {
  DISABLED: 0,
  GRADUAL: 1,
  PARTIAL: 2,
  ENABLED: 3,
};

export type SemanticValidationOptions = {
  /** When true, skip checks (e.g. baseline missing) */
  lenient?: boolean;
};

export type SemanticValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  diff: string[];
};

function rolloutRank(status: string | undefined): number {
  if (!status) return -1;
  return ROLLOUT_RANK[status] ?? -1;
}

export function validateSnapshotSemantics(
  candidate: SelectorRuntimeSnapshot,
  baseline: SelectorRuntimeSnapshot,
  options: SemanticValidationOptions = {},
): SemanticValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const diff = diffRuntimeSnapshots(candidate, baseline);

  if (options.lenient) {
    return { valid: true, errors, warnings, diff };
  }

  const candidateMin = candidate.config.thresholds.sheetMinOptions;
  const baselineMin = baseline.config.thresholds.sheetMinOptions;
  if (candidateMin < baselineMin && !candidate.provenance.allowThresholdRegression) {
    errors.push(
      `threshold regression: sheetMinOptions ${candidateMin} < baseline ${baselineMin} without allowThresholdRegression`,
    );
  }

  for (const [domain, baselineStatus] of Object.entries(baseline.config.rolloutByDomain)) {
    const candidateStatus = candidate.config.rolloutByDomain[domain];
    if (baselineStatus === "ENABLED" && candidateStatus === undefined) {
      errors.push(`domain rollout removed: ${domain} was ENABLED in baseline`);
    }
    if (
      baselineStatus &&
      candidateStatus &&
      rolloutRank(candidateStatus) > rolloutRank(baselineStatus) &&
      !candidate.provenance.allowPermissiveRollback
    ) {
      errors.push(
        `permissive rollout transition on ${domain}: ${baselineStatus} → ${candidateStatus} without allowPermissiveRollback`,
      );
    }
  }

  for (const id of candidate.provenance.appliedProposals) {
    if (candidate.provenance.ignoredProposals.includes(id)) {
      errors.push(`proposal ${id} is both applied and ignored`);
    }
  }

  const appliedDomains = new Set<string>();
  for (const domain of Object.keys(candidate.config.rolloutByDomain)) {
    if (appliedDomains.has(domain)) {
      warnings.push(`duplicate domain key in rolloutByDomain: ${domain}`);
    }
    appliedDomains.add(domain);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    diff,
  };
}

export function validateSnapshotSemanticsOrThrow(
  candidate: SelectorRuntimeSnapshot,
  baseline: SelectorRuntimeSnapshot,
  options?: SemanticValidationOptions,
): SemanticValidationResult {
  const result = validateSnapshotSemantics(candidate, baseline, options);
  if (!result.valid) {
    throw new Error(`Semantic validation failed: ${result.errors.join("; ")}`);
  }
  return result;
}
