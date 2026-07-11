/**
 * Shadow policy — criteria for legacy vs Control Plane cutover readiness.
 */
import type { ControlOutcome } from "@/lib/control/types";

export const SHADOW_SUCCESS_POLICY = {
  minConsecutiveGreen: 20,
  maxBlockerMismatchRate: 0,
  maxUnexpectedNewFailures: 0,
  maxWarningMismatchRate: 0.05,
  maxDurationRegressionRatio: 1.2,
  minMappedControlCoverage: 0.85,
} as const;

/** Legacy release-gate npm step → control id */
export const LEGACY_CONTROL_MAP: Record<string, string> = {
  "npm run ci:tsc": "security.typescript.compile",
  "npm run ci:build": "domain.build.production",
  "npm run test:rbac": "security.rbac.matrix",
  "npm run test:rbac:hardening": "security.rbac.hardening",
  "npm run ux:enforce": "design.ux.enforce",
  "npm run audit:ui": "design.ui.consistency",
  "npm run ux:mobile-gate": "design.mobile.gate",
  "npm run ios:check": "design.ios.static",
  "npm run production:check": "data.production.readiness",
  "npm run smoke:structural": "design.structural.smoke",
  "npm run flex:eslint:gate": "design.flex.eslint",
  "npm run flex:freeze:gate": "design.flex.freeze",
  "npm run smoke:playwright": "runtime.e2e.smoke",
};

export type LegacyOutcome = "pass" | "fail";

export type ShadowPolicyInput = {
  runId: string;
  timestamp: string;
  legacyOutcomes: Record<string, LegacyOutcome>;
  controlResults: { controlId: string; outcome: ControlOutcome; durationMs?: number }[];
  priorGreenStreak?: number;
  baselineDurationP95Ms?: number;
};

export type ShadowPolicyViolation = {
  code: string;
  message: string;
  controlId?: string;
};

export type ShadowPolicyReport = {
  runId: string;
  timestamp: string;
  advisory: boolean;
  passed: boolean;
  mappedControlCoverage: number;
  unexpectedNewFailures: number;
  blockerMismatchRate: number;
  warningMismatchRate: number;
  durationRegressionRatio: number | null;
  consecutiveGreen: number;
  violations: ShadowPolicyViolation[];
  comparisons: {
    controlId: string;
    legacyStep: string;
    legacy: LegacyOutcome;
    control: ControlOutcome;
    unexpectedNewFailure: boolean;
    blockerMismatch: boolean;
  }[];
};

const FAIL_OUTCOMES = new Set<ControlOutcome>(["fail", "blocked"]);
const PASS_OUTCOMES = new Set<ControlOutcome>(["pass"]);
const WARNING_OUTCOMES = new Set<ControlOutcome>(["warning"]);

function isPass(outcome: ControlOutcome | undefined): boolean {
  return outcome !== undefined && PASS_OUTCOMES.has(outcome);
}

function isFail(outcome: ControlOutcome | undefined): boolean {
  return outcome !== undefined && FAIL_OUTCOMES.has(outcome);
}

export function evaluateShadowPolicy(input: ShadowPolicyInput): ShadowPolicyReport {
  const byId = new Map(input.controlResults.map((r) => [r.controlId, r]));
  const violations: ShadowPolicyViolation[] = [];
  const comparisons: ShadowPolicyReport["comparisons"] = [];

  let unexpectedNewFailures = 0;
  let blockerMismatches = 0;
  let warningMismatches = 0;
  let mappedWithResult = 0;
  const mappedTotal = Object.keys(LEGACY_CONTROL_MAP).length;

  for (const [legacyStep, controlId] of Object.entries(LEGACY_CONTROL_MAP)) {
    const legacy = input.legacyOutcomes[legacyStep] ?? "fail";
    const control = byId.get(controlId);
    const controlOutcome = control?.outcome ?? "unknown";

    if (control) mappedWithResult += 1;

    const unexpectedNewFailure = legacy === "pass" && isFail(controlOutcome);
    const blockerMismatch =
      (legacy === "fail" && isPass(controlOutcome)) || (legacy === "pass" && isFail(controlOutcome));

    if (unexpectedNewFailure) {
      unexpectedNewFailures += 1;
      violations.push({
        code: "unexpected-new-failure",
        message: `${controlId}: legacy pass → control ${controlOutcome}`,
        controlId,
      });
    }
    if (legacy === "fail" && isPass(controlOutcome)) {
      blockerMismatches += 1;
    }
    if (
      (legacy === "pass" && WARNING_OUTCOMES.has(controlOutcome)) ||
      (legacy === "fail" && WARNING_OUTCOMES.has(controlOutcome))
    ) {
      warningMismatches += 1;
    }

    comparisons.push({
      controlId,
      legacyStep,
      legacy,
      control: controlOutcome,
      unexpectedNewFailure,
      blockerMismatch,
    });
  }

  const mappedControlCoverage = mappedTotal === 0 ? 1 : mappedWithResult / mappedTotal;
  const blockerMismatchRate = mappedTotal === 0 ? 0 : blockerMismatches / mappedTotal;
  const warningMismatchRate = mappedTotal === 0 ? 0 : warningMismatches / mappedTotal;

  const durations = input.controlResults
    .map((r) => r.durationMs ?? 0)
    .filter((d) => d > 0)
    .sort((a, b) => a - b);
  const p95Idx = durations.length ? Math.min(durations.length - 1, Math.floor(durations.length * 0.95)) : -1;
  const durationP95 = p95Idx >= 0 ? durations[p95Idx] : null;
  const durationRegressionRatio =
    durationP95 !== null && input.baselineDurationP95Ms && input.baselineDurationP95Ms > 0
      ? durationP95 / input.baselineDurationP95Ms
      : null;

  if (unexpectedNewFailures > SHADOW_SUCCESS_POLICY.maxUnexpectedNewFailures) {
    violations.push({
      code: "max-unexpected-new-failures",
      message: `unexpectedNewFailures=${unexpectedNewFailures} > ${SHADOW_SUCCESS_POLICY.maxUnexpectedNewFailures}`,
    });
  }
  if (blockerMismatchRate > SHADOW_SUCCESS_POLICY.maxBlockerMismatchRate) {
    violations.push({
      code: "blocker-mismatch-rate",
      message: `blockerMismatchRate=${blockerMismatchRate.toFixed(3)} > ${SHADOW_SUCCESS_POLICY.maxBlockerMismatchRate}`,
    });
  }
  if (warningMismatchRate > SHADOW_SUCCESS_POLICY.maxWarningMismatchRate) {
    violations.push({
      code: "warning-mismatch-rate",
      message: `warningMismatchRate=${warningMismatchRate.toFixed(3)} > ${SHADOW_SUCCESS_POLICY.maxWarningMismatchRate}`,
    });
  }
  if (mappedControlCoverage < SHADOW_SUCCESS_POLICY.minMappedControlCoverage) {
    violations.push({
      code: "mapped-control-coverage",
      message: `coverage=${mappedControlCoverage.toFixed(3)} < ${SHADOW_SUCCESS_POLICY.minMappedControlCoverage}`,
    });
  }
  if (
    durationRegressionRatio !== null &&
    durationRegressionRatio > SHADOW_SUCCESS_POLICY.maxDurationRegressionRatio
  ) {
    violations.push({
      code: "duration-regression",
      message: `durationRegressionRatio=${durationRegressionRatio.toFixed(2)} > ${SHADOW_SUCCESS_POLICY.maxDurationRegressionRatio}`,
    });
  }

  const runPassed = violations.filter((v) => v.code !== "consecutive-green").length === 0;
  const consecutiveGreen = runPassed ? (input.priorGreenStreak ?? 0) + 1 : 0;

  if (consecutiveGreen < SHADOW_SUCCESS_POLICY.minConsecutiveGreen) {
    violations.push({
      code: "consecutive-green",
      message: `consecutiveGreen=${consecutiveGreen} < ${SHADOW_SUCCESS_POLICY.minConsecutiveGreen}`,
    });
  }

  return {
    runId: input.runId,
    timestamp: input.timestamp,
    advisory: true,
    passed: runPassed,
    mappedControlCoverage,
    unexpectedNewFailures,
    blockerMismatchRate,
    warningMismatchRate,
    durationRegressionRatio,
    consecutiveGreen,
    violations,
    comparisons,
  };
}

export function evaluateShadowPolicyStrict(report: ShadowPolicyReport): ShadowPolicyReport {
  // ponytail: PR strict = per-run parity; 20-SHA consecutive gate is shadow-cutover-report (--gate)
  const passed =
    report.unexpectedNewFailures <= SHADOW_SUCCESS_POLICY.maxUnexpectedNewFailures &&
    report.blockerMismatchRate <= SHADOW_SUCCESS_POLICY.maxBlockerMismatchRate;
  return { ...report, advisory: false, passed };
}

export function evaluateShadowPolicyRampStrict(report: ShadowPolicyReport): ShadowPolicyReport {
  const cutoverReady =
    report.passed &&
    report.consecutiveGreen >= SHADOW_SUCCESS_POLICY.minConsecutiveGreen &&
    report.unexpectedNewFailures <= SHADOW_SUCCESS_POLICY.maxUnexpectedNewFailures;
  return { ...report, advisory: false, passed: cutoverReady };
}
