# Full Regression Matrix — 2026-08-30 (Fase 4)

Commit: `a4c00c0cac11e51ae9c46e274a0058898397194c`  
RC snapshot: `docs/audit/release-candidate-2026-08-30.json`  
CERTIFIABLE_TREE: valid (`unknownChanges=0`, `untrackedUnknown=0`)

| Gate ID (contract) | Command | Tier | Status | Classification | Notes |
|-------------------|---------|------|--------|----------------|-------|
| — | `npm run lint` | static | **PASS** | — | 0 errors / 0 warnings |
| security.typescript.compile | `npm run ci:tsc` | static | **PASS** | — | 243→0 errors remediated |
| — | `npm run flex:eslint:gate` | static | **PASS** | — | 0 new flex violations |
| design.flex.freeze | `npm run flex:freeze:gate` | static | **PASS** | — | freeze registry gate |
| design.ux.enforce | `npm run ux:enforce` | static | **PASS** | — | |
| design.ui.consistency | `npm run audit:ui` | static | **PASS** | REAL_FAILURE fixed | 3→0 blockers (tooltip + prevTableTd) |
| design.mobile.gate | `npm run ux:mobile-gate` | static | **PASS** | — | heuristic advisories only |
| design.ios.static | `npm run ios:check` | static | **PASS** | — | informational findings |
| design.structural.smoke | `npm run smoke:structural` | static | **PASS** | STALE_ASSERTION | app-shell layout anchor comment |
| — | `npm run smoke:regression:core` | static | **FAIL** | REAL_FAILURE | audits aligned (hub v2, textarea SSOT, notifications); run5 pending full PASS |
| security.rbac.matrix | `npm run test:rbac` | static | **PASS** | — | |
| security.rbac.hardening | `npm run test:rbac:hardening` | static | **PASS** | PHASE4_RBAC | entry migrations + legacy sync constants |
| security.remediation | `npm run test:security:remediation` | static | **PASS** | PHASE4 | communications draft route authz |
| — | `release-ready-contract.test.ts` | governance | **PASS** | — | |
| — | `npm run control:review` | control | **PASS** | — | 84 controls |
| — | `npm run control:parity` | control | **PASS** | — | |
| — | `SMOKE_SKIP=1 npm run control:pr` | control | **FAIL** | ENVIRONMENT / PRE_EXISTING | 8 fail, 26 blocked (supabase, build budget, report v2 chain) |
| build.production | `npm run ci:build` | build | **FAIL** | REAL_FAILURE | attempt7: global 1930.8KB; shell ~1914KB; `test-results/build-budget-diff.json` |
| data.supabase.connection | `verify-supabase-ci-env` | live | **BLOCKED** | ENVIRONMENT | missing `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` |
| data.production.readiness | `npm run production:check` | live | **BLOCKED** | ENVIRONMENT | blocked by supabase |
| data.publication.sanity | `npm run ci:supabase:publication` | live | **BLOCKED** | ENVIRONMENT | |
| — | `ci-smoke-preflight --tier=pr` | live | **BLOCKED** | ENVIRONMENT | |
| — | `npm run smoke:playwright` | e2e | **BLOCKED** | ENVIRONMENT | not executed |
| runtime.smoke.cleanup | `npm run smoke:cleanup` | e2e | **BLOCKED** | ENVIRONMENT | requires smoke session / CI |

## Remediation slice (Fase 4 scope)

| Check | Status |
|-------|--------|
| lint 0/0 | PASS |
| ci:tsc | PASS |
| test:rbac:hardening | PASS |
| release-ready-contract | PASS |
| CERTIFIABLE_TREE | PASS |

## Diff ownership (summary)

| Bucket | Count |
|--------|------:|
| knownPreexistingChanges | 747 |
| knownPhase4Changes | 64+ |
| unknownChanges | 0 |
