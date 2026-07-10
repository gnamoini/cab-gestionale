/** Mirrors package.json test:rbac — scope: page matrix, overrides, workflow permissions (catalog SSOT). */
export const SECURITY_RBAC_SUITE: readonly string[] = [
  "src/lib/permissions/effective-permissions.test.ts",
  "lib/regression/rbac-data-driven-resolver.test.ts",
  "lib/regression/permissions-role-matrix.test.ts",
  "lib/regression/security-rbac-policy.test.ts",
  "lib/regression/security-roles-actions.test.ts",
  "lib/regression/rbac-route-matrix.test.ts",
  "lib/regression/role-switch-hardening.test.ts",
  "lib/security/build-security-user-patches.test.ts",
  "lib/security/user-module-permissions.test.ts",
  "lib/regression/role-module-parity.test.ts",
  "lib/rbac.capability.test.ts",
  "lib/auth/client-portal-nav-access.test.ts",
  "lib/auth/resolve-post-login-redirect.test.ts",
];

export const SECURITY_RBAC_HARDENING_SUITE: readonly string[] = [
  "lib/regression/rbac-entrypoint-audit.test.ts",
  "lib/regression/rbac-entrypoint-call-site-audit.test.ts",
  "lib/regression/rbac-no-entrypoint-chaining.test.ts",
  "lib/regression/rbac-domain-error-hygiene.test.ts",
  "lib/regression/rbac-portal-tenant-isolation.test.ts",
  "lib/regression/rbac-legacy-audit.test.ts",
  "lib/regression/rbac-ssr-client-parity.test.ts",
  "lib/regression/rbac-cross-layer-matrix.test.ts",
  "lib/regression/sidebar-nav-rbac.test.ts",
  "lib/regression/rbac-cache-invalidation.test.ts",
  "lib/regression/rbac-production-readiness.test.ts",
];
