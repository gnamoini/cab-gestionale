/**
 * Audit metadata: why each test sits in a tier (NOT in control registry).
 */
import { P0_CRITICAL_ALLOWLIST } from "@/lib/control/suites/regression-p0-critical";

export type ClassificationReason =
  | "security-boundary"
  | "data-loss-prevention"
  | "workflow-integrity"
  | "customer-impact"
  | "ux-only";

export type RegressionTier = "P0" | "P1" | "P2" | "P3";

export type RegressionClassificationReason = {
  test: string;
  tier: RegressionTier;
  reason: ClassificationReason;
};

/** Explicit reasons for P0 allowlist entries */
const P0_REASON_BY_TEST: Record<string, ClassificationReason> = {
  "lib/regression/security-ban-middleware-policy.test.ts": "security-boundary",
  "lib/auth/user-ban-state.test.ts": "security-boundary",
  "lib/regression/role-switch-refresh-idempotency.test.ts": "security-boundary",
  "lib/security/http-security-headers.test.ts": "security-boundary",
  "lib/regression/security-users-permissions-policy.test.ts": "security-boundary",
  "lib/regression/security-page-architecture-policy.test.ts": "security-boundary",
  "lib/regression/input-security-policy.test.ts": "security-boundary",
  "lib/regression/forms-save-policy.test.ts": "workflow-integrity",
  "lib/regression/fatturazione-status-write-audit.test.ts": "workflow-integrity",
  "lib/regression/fatturazione-db-write-graph.test.ts": "workflow-integrity",
  "lib/regression/fatturazione-production-readiness.test.ts": "customer-impact",
  "lib/documenti/documento-file-access.test.ts": "data-loss-prevention",
  "lib/regression/documenti-file-access-policy.test.ts": "data-loss-prevention",
  "lib/regression/supabase-publication-gate.test.ts": "data-loss-prevention",
  "lib/regression/import-export-migration-gate.test.ts": "data-loss-prevention",
  "lib/regression/import-files-boundary.test.ts": "data-loss-prevention",
  "lib/regression/import-core-state-machine.test.ts": "data-loss-prevention",
  "lib/regression/data-import-export-policy.test.ts": "data-loss-prevention",
  "lib/regression/attrezzature-v2-production-gate.test.ts": "data-loss-prevention",
  "lib/regression/asset-lifecycle-production-gate.test.ts": "data-loss-prevention",
  "lib/production/production-readiness.test.ts": "customer-impact",
  "lib/ops/validate-production-env.test.ts": "customer-impact",
  "lib/document-capture/document-capture-tenant-guard.test.ts": "security-boundary",
  "lib/document-capture/capture-apply-plan.test.ts": "data-loss-prevention",
  "lib/regression/document-capture-rls-audit.test.ts": "security-boundary",
  "lib/document-capture/invariants.test.ts": "data-loss-prevention",
  "lib/document-capture/certification/document-capture-v41-certification.test.ts": "data-loss-prevention",
  "lib/regression/document-capture-core.test.ts": "data-loss-prevention",
  "lib/validation/services/mezzi-payload-v2-guard.test.ts": "workflow-integrity",
  "lib/validation/admin-user-validation.test.ts": "security-boundary",
  "lib/validation/password-validation.test.ts": "security-boundary",
  "lib/validation/security-actions-validation.test.ts": "security-boundary",
  "lib/regression/form-ux-boundary-gate.test.ts": "workflow-integrity",
  "lib/regression/dashboard-promemoria-rbac.test.ts": "security-boundary",
  "lib/regression/truth-invalidation.test.ts": "data-loss-prevention",
};

const META_INDEX = new Map<string, RegressionClassificationReason>();

for (const test of P0_CRITICAL_ALLOWLIST) {
  META_INDEX.set(test, {
    test,
    tier: "P0",
    reason: P0_REASON_BY_TEST[test] ?? "customer-impact",
  });
}

export function registerClassificationMeta(entry: RegressionClassificationReason): void {
  META_INDEX.set(entry.test, entry);
}

export function getClassificationReason(test: string): RegressionClassificationReason | undefined {
  return META_INDEX.get(test);
}

export function getAllClassificationMeta(): RegressionClassificationReason[] {
  return [...META_INDEX.values()];
}
