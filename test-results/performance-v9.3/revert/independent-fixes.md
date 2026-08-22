# Independent fixes preserved during V9.3 revert

## map-auth-user.ts

- **Change:** `resolveRole` from `@/lib/rbac` (not `@/lib/auth/rbac`); inlined `normalizeClienteRef` to avoid `cliente-portal-scope` barrel
- **Classification:** Independent bug fix / anti-pattern fix
- **V9.3 dependency:** Discovered during V9.3 audit but does not require hydrate or session-actions
- **Decision:** KEEP

## fetch-rbac-role-key.ts

- **Change:** `resolveRole` from `@/lib/rbac`
- **Classification:** Independent — same lightweight import path
- **Decision:** KEEP

## Rationale

`@/lib/auth/rbac` statically pulls `gestionale-pages` + `resolve-page-access`. Auth bootstrap only needs `resolveRole` from `@/lib/rbac` (type-only link to resolve-page-access).
