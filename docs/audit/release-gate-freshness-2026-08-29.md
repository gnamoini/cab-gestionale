# Release Gate Freshness Audit — 2026-08-29

**Repository commit:** `a4c00c0cac11e51ae9c46e274a0058898397194c` (pre-remediation baseline run)  
**Node:** v24.15.0 · **npm:** 11.12.1  
**Scope:** Fase 0 inventory + Tier A–D execution + coverage matrix + remediation plan

---

## Executive summary

| Metric | Value |
|--------|-------|
| Control Plane controls | **84** (was 83; +`governance.release.contract`) |
| Regression CORE / EXT / ALL | **278 / 210 / 488** |
| Regression P0 / P1 / P2 / P3 | **79 / 201 / 27 / 175** |
| GitHub workflows (gate) | **8** |
| Gates CURRENT | ~45 |
| Gates STALE (pre-remediation) | **docs** (63-test claim, spec 13/14 in PR) |
| Gates BROKEN (pre-remediation) | **classification** (P0 max, duplicates), **security.remediation** missing from legacy |
| Coverage MISSING (pre-remediation) | identifica-ricambio, stock RPC, numeric-input wired |
| Primary risks | TS/build failures (product), flex baseline drift, RBAC call-site audit, audit:ui blockers |

**Remediation applied in Fase 1:** contract SSOT, conformance test, security remediation in legacy CI, wired tests, duplicate list fixes, authz baseline for public password-reset route.

---

## Gate inventory

### CI blocking PR — `release-gate.yml`

| Step | Status (local Tier A) | Failure type |
|------|----------------------|--------------|
| `ci:tsc` | **FAIL** | REAL_FAILURE (TS errors in spare-parts, admin-users, inventory-labels) |
| `ci:build` | **FAIL** | ENVIRONMENT_FAILURE locally (missing `VERCEL_GIT_COMMIT_SHA`); CI has env |
| `test:rbac` | **PASS** | — |
| `test:rbac:hardening` | **FAIL** | REAL_FAILURE (`rbac-entrypoint-call-site-audit` — 5 runtime service imports) |
| `test:security:remediation` | **FAIL→FIX** | STALE_ASSERTION (`request-password-reset` public route not in baseline) — **fixed** |
| `ux:enforce` | **PASS** | — |
| `audit:ui` | **FAIL** | REAL_FAILURE (20+ native title / prevTableTd blockers) |
| `ux:mobile-gate` | **PASS** | — |
| `ios:check` | **PASS** | — |
| `smoke:structural` | **FAIL** | STALE_ASSERTION (app-shell token scan vs current shell) |
| `smoke:regression:core` | not fully run | (278 tests — run in CI) |
| `flex:eslint:gate` | **FAIL** | REAL_FAILURE (8 new flex violations) |
| `flex:freeze:gate` | **FAIL** | (depends on flex eslint) |
| `release-ready-contract` | **PASS** | (post-remediation) |
| `smoke:playwright` | **BLOCKED** | ENVIRONMENT_FAILURE (no smoke creds locally) |
| `control:review` / `parity` | **PASS** | — |
| `regression-classification` | **FAIL→FIX** | BROKEN_GATE (duplicates, P0 max) — **fixed** |

### Shadow — `control-pr-shadow`

`control:local` with `SMOKE_SKIP=1` — contract-compatible subset.

### Control PR — `control-pr.yml`

`control:pr` — 84 controls, E2E skipped; includes full `lint` blocker (Fase 2 debt).

---

## Coverage matrix

| Superficie | Gate | Copertura | Stato pre | Stato post |
|------------|------|-----------|-----------|------------|
| Auth/RBAC | test:rbac* | Completa statica | CURRENT | CURRENT |
| RLS/RPC | security.remediation | Forte statica | PARTIAL (legacy gap) | **CURRENT** |
| Magazzino stock | stock-* tests | Parziale | PARTIAL | **CURRENT** (wired CORE) |
| Ordini fornitori | CORE + E2E | Buona | CURRENT | CURRENT |
| Ricambi AI | identifica-ricambio-policy | Assente | MISSING | **CURRENT** |
| PDF | pdf-* extended | Parziale PR | PARTIAL | PARTIAL |
| Lavorazioni | CORE + spec 13 cert | E2E cert-only | PARTIAL | PARTIAL |
| Portal | client-portal-* + sync scope | Buona | CURRENT | CURRENT |
| Report | governance.report.v2.* (CP) | Forte CP | PARTIAL legacy | PARTIAL |
| QR / inventory labels | CORE + E2E 21 | Buona | CURRENT | CURRENT |
| Metadata | page-metadata-policy | Non wired | PARTIAL | **CURRENT** |
| Build/TS/ESLint | ci:*, flex | Lint gap legacy | PARTIAL | PARTIAL |
| Performance | build-budget, observe | Measurement | PARTIAL | PARTIAL |
| Migration parity | staging only | Non PR | MISSING | MISSING |

---

## Script classification (0.7)

| Item | Action | Reason |
|------|--------|--------|
| `release:gate` | **DEPRECATED** | Redirect → `control:local`; not removed |
| `numeric-input-anti-patterns` | **UPDATE** | Wired EXTENDED |
| `spare-parts-*`, stock tests | **UPDATE** | Wired CORE |
| `performance-policy` duplicate | **MERGE** | Removed from PERFORMANCE_GOVERNANCE_SUITE (in CORE) |
| `boot-investigation` duplicate | **MERGE** | Removed duplicate EXTENDED entry |
| Dual lint policy | **DOCUMENTED** | Intentional divergence in contract |
| `governance.release.contract` | **ADDED** | Anti-drift |

---

## Remediation plan executed (Fase 1)

| Priority | Item |
|----------|------|
| P0 | `docs/release-gate-contract.{md,json}`, `release-ready-contract` test, security remediation in `release-gate.yml` |
| P0 | Fix regression list duplicates + classification bounds |
| P1 | Wire stock, spare-parts, identifica-ricambio, metadata, portal sync |
| P1 | Update `release-gate.md`, `gate-matrix.md` |
| P2 | `numeric-input` in extended tier |
| P3 | `release:gate` deprecation banner |

---

## Residual risk (post Fase 1)

- **Repository not release-ready:** `ci:tsc`, `audit:ui`, `flex:eslint:gate`, `smoke:structural`, `test:rbac:hardening` fail on current tree — product/gate debt, not masked.
- **E2E spec 13/14** remain cert-only (intentional).
- **Migration parity** not in PR tier.
- **Full lint** (~400 violations) deferred to Fase 2.

---

## Artifacts

- [`release-gate-contract.md`](../release-gate-contract.md)
- [`release-gate-baseline-2026-08-29.json`](./release-gate-baseline-2026-08-29.json)
- [`phase2-lint-handoff-2026-08-29.md`](./phase2-lint-handoff-2026-08-29.md)
- [`gate-run-log-2026-08-29.txt`](./gate-run-log-2026-08-29.txt)
- `control-inventory.json` (generated)
