/**
 * P0 critical allowlist — intentional classification (audit SSOT).
 * Files here are P0 even if patterns would miss them.
 */
export const P0_CRITICAL_ALLOWLIST: readonly string[] = [
  // Security / session
  "lib/regression/security-ban-middleware-policy.test.ts",
  "lib/auth/user-ban-state.test.ts",
  "lib/regression/role-switch-refresh-idempotency.test.ts",
  "lib/security/http-security-headers.test.ts",
  "lib/regression/security-users-permissions-policy.test.ts",
  "lib/regression/security-page-architecture-policy.test.ts",
  "lib/regression/input-security-policy.test.ts",
  // Forms / workflow write
  "lib/regression/forms-save-policy.test.ts",
  "lib/regression/fatturazione-status-write-audit.test.ts",
  "lib/regression/fatturazione-db-write-graph.test.ts",
  "lib/regression/fatturazione-production-readiness.test.ts",
  // Data / files
  "lib/documenti/documento-file-access.test.ts",
  "lib/regression/documenti-file-access-policy.test.ts",
  "lib/regression/supabase-publication-gate.test.ts",
  "lib/regression/import-export-migration-gate.test.ts",
  "lib/regression/import-files-boundary.test.ts",
  "lib/regression/import-core-state-machine.test.ts",
  "lib/regression/data-import-export-policy.test.ts",
  "lib/regression/attrezzature-v2-production-gate.test.ts",
  "lib/regression/asset-lifecycle-production-gate.test.ts",
  "lib/production/production-readiness.test.ts",
  "lib/ops/validate-production-env.test.ts",
  // Document capture invariants
  "lib/document-capture/document-capture-tenant-guard.test.ts",
  "lib/document-capture/capture-apply-plan.test.ts",
  "lib/regression/document-capture-rls-audit.test.ts",
  "lib/document-capture/invariants.test.ts",
  "lib/document-capture/certification/document-capture-v41-certification.test.ts",
  "lib/regression/document-capture-core.test.ts",
  // Validation / mezzi write guard
  "lib/validation/services/mezzi-payload-v2-guard.test.ts",
  "lib/validation/admin-user-validation.test.ts",
  "lib/validation/password-validation.test.ts",
  "lib/validation/security-actions-validation.test.ts",
  "lib/regression/form-ux-boundary-gate.test.ts",
  "lib/regression/dashboard-promemoria-rbac.test.ts",
  "lib/regression/truth-invalidation.test.ts",
];

export const P0_CRITICAL_SET = new Set(P0_CRITICAL_ALLOWLIST);
