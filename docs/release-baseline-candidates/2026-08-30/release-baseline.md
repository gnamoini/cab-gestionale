# Release baseline — 2026-08-30

- status: **CANDIDATE**
- certificationStatus: **NOT_CERTIFIED**
- releaseReady: **false**
- localFullRegression: **FAIL**
- ciReleaseCertification: **PENDING**
- commit: `a4c00c0cac11e51ae9c46e274a0058898397194c`
- contractVersion: 1.0.0

## Gate results

| Contract ID | Legacy | Tier | Status | Notes |
|-------------|--------|------|--------|-------|
| security.typescript.compile | ci:tsc | static | **PASS** | — |
| build.production | ci:build | static | **FAIL** | — |
| security.rbac.matrix | test:rbac | static | **PASS** | — |
| security.rbac.hardening | test:rbac:hardening | static | **PASS** | — |
| security.remediation | test:security:remediation | static | **PASS** | — |
| design.ux.enforce | ux:enforce | static | **PASS** | — |
| design.ui.consistency | audit:ui | static | **PASS** | — |
| design.mobile.gate | ux:mobile-gate | static | **PASS** | — |
| design.ios.static | ios:check | static | **PASS** | — |
| data.supabase.connection | verify-supabase-ci-env | live | **BLOCKED** | — |
| data.production.readiness | production:check | live | **BLOCKED** | — |
| data.publication.sanity | ci:supabase:publication | live | **BLOCKED** | — |
| design.structural.smoke | smoke:structural | static | **PASS** | — |
| runtime.regression.core | smoke:regression:core | static | **FAIL** | — |
| design.flex.eslint | flex:eslint:gate | static | **PASS** | — |
| design.flex.freeze | flex:freeze:gate | static | **PASS** | — |
| runtime.e2e.smoke | smoke:playwright | live | **BLOCKED** | — |
| runtime.smoke.cleanup | smoke:cleanup | live | **BLOCKED** | — |
| governance.release.contract | release-ready-contract | static | **PASS** | — |

RC snapshot: docs/audit/release-candidate-2026-08-30.json
Matrix: docs/audit/full-regression-matrix-2026-08-30.md
