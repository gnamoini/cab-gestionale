# Final Release Certification — 2026-08-30

## Decision

| Field | Value |
|-------|--------|
| `certificationStatus` | **NOT_CERTIFIED** |
| `releaseReady` | **false** |
| `localFullRegression` | **FAIL** |
| `ciReleaseCertification` | **BLOCKED** |

Remediation slice (lint/tsc/rbac/contract) remains **PASS**. Full regression is not certified.

## Local gates — PASS

- ESLint 0/0
- `ci:tsc`
- `test:rbac` + `test:rbac:hardening`
- `test:security:remediation`
- `ux:enforce`, `audit:ui`, `ux:mobile-gate`, `ios:check`
- `smoke:structural`
- `flex:eslint:gate`, `flex:freeze:gate`
- `release-ready-contract`
- `certifiableTree` (unknownChanges=0)

## Local gates — FAIL

| Gate | Classification | Notes |
|------|----------------|-------|
| `ci:build` | REAL_FAILURE | Global max **1930.8KB** (`/report`) vs 1900KB; gestionale shell **~1914KB** (was ~2809KB at start). Lazy splits: report areas, carichi list/wizard, notification bell, iOS stability defer, AI providers page. Public routes **~1825KB** vs 1700KB. `/lavorazioni-clienti` **1914KB** vs 1400KB (architectural: full gestionale shell). |
| `smoke:regression:core` | REAL_FAILURE | Many audits aligned (hub v2, textarea SSOT, notification cron/SSOT). Run 5 in progress after fixes. |

## CI gates — BLOCKED (expected locally)

- Supabase connection, `production:check`, publication sanity
- `smoke:playwright`, `smoke:cleanup`
- `control:pr` cascades from build + live env

## Fase 5

- **Candidate:** `docs/release-baseline-candidates/2026-08-30/` (`status=CANDIDATE`, `releaseReady=false`)
- **Official baseline:** **not created** (CI not green — per plan)

## Artifacts

- `docs/audit/phase4-failure-inventory-2026-08-30.json`
- `docs/audit/release-candidate-2026-08-30.json`
- `docs/audit/full-regression-baseline-2026-08-30.json`
- `docs/audit/ci-certification-2026-08-30/`
