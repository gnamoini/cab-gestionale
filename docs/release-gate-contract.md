# RELEASE_READY — Release Gate Contract (SSOT)

**Version:** 1.0.0  
**Merge authority:** `release-gate` (GitHub Actions [`.github/workflows/release-gate.yml`](../.github/workflows/release-gate.yml))  
**Machine-readable:** [`release-gate-contract.json`](./release-gate-contract.json)  
**Conformance gate:** [`lib/control/release-ready-contract.test.ts`](../lib/control/release-ready-contract.test.ts)

---

## Architecture

```text
                  RELEASE_READY contract
                  (required control IDs)
                           │
              ┌────────────┴────────────┐
              │                         │
       release-gate                control:pr
       MERGE AUTHORITY             CONFORMING
              │                         │
              └────────────┬────────────┘
                           │
                    contract parity
                           │
                    shadow compare
```

- **`release-gate`** is the only merge/deploy authority until an explicit cutover decision.
- **`control:pr`** must remain **contract-compatible**; it is not required to run identical commands during transition.
- **`smoke:regression:core` (268 tests) is not equivalent to `runtime.regression.p0` (79 tests)** — the relationship is documented and reconciled, not assumed.

---

## RELEASE_READY definition

A commit is **RELEASE_READY** when all **required** controls in [`release-gate-contract.json`](./release-gate-contract.json) pass on the legacy path:

| Control ID | Legacy step | Control Plane |
|------------|-------------|---------------|
| `security.typescript.compile` | `npm run ci:tsc` | `security.typescript.compile` |
| `domain.build.production` | `npm run ci:build` | `domain.build.production` |
| `security.rbac.matrix` | `npm run test:rbac` | `security.rbac.matrix` |
| `security.rbac.hardening` | `npm run test:rbac:hardening` | `security.rbac.hardening` |
| `security.remediation` | `npm run test:security:remediation` | `security.remediation` |
| `design.ux.enforce` | `npm run ux:enforce` | `design.ux.enforce` |
| `design.ui.consistency` | `npm run audit:ui` | `design.ui.consistency` |
| `design.mobile.gate` | `npm run ux:mobile-gate` | `design.mobile.gate` |
| `design.ios.static` | `npm run ios:check` | `design.ios.static` |
| `data.supabase.connection` | `verify-supabase-ci-env.ts` | `data.supabase.connection` |
| `data.production.readiness` | `npm run production:check` | `data.production.readiness` |
| `data.publication.sanity` | `npm run ci:supabase:publication` | `data.publication.sanity` |
| `design.structural.smoke` | `npm run smoke:structural` | `design.structural.smoke` |
| `runtime.regression.core` | `npm run smoke:regression:core` | `runtime.regression.p0` (reconciled) |
| `design.flex.eslint` | `npm run flex:eslint:gate` | `design.flex.eslint` |
| `design.flex.freeze` | `npm run flex:freeze:gate` | `design.flex.freeze` |
| `runtime.e2e.smoke` | `npm run smoke:playwright` | `runtime.e2e.smoke` |
| `runtime.smoke.cleanup` | `npm run smoke:cleanup` | `runtime.smoke.cleanup` |
| `governance.release.contract` | `release-ready-contract.test.ts` | `governance.release.contract` |

### CERT_READY (post-merge on `main`)

`RELEASE_READY` plus:

- `smoke:regression:extended`
- `ci:supabase:publication:full`
- E2E cert specs 13/14 (`smoke:playwright:cert`, scheda, ricambio)
- `ops:long-session-soak:threshold`

---

## Intentional divergences (transition)

| Topic | Legacy | Control Plane | Reason |
|-------|--------|---------------|--------|
| E2E smoke | Blocking in `release-gate` | Skipped when `SMOKE_SKIP=1` | CP PR runs conforming subset |
| Full ESLint | Advisory (`release-gate-nightly`) | Blocker in `control:pr` | Lint debt → Fase 2 |
| CORE vs P0 | Full CORE list (268) | P0 partition (79) | Security-critical subset in CP; CORE on legacy |

---

## Critical surface coverage (wired in CORE)

| Surface | Regression tests |
|---------|------------------|
| Magazzino stock | `stock-apply-movement-signature`, `stock-writer-matrix`, `magazzino-stock-audit-payload` |
| Ricambi AI | `identifica-ricambio-policy`, `spare-parts-policy`, `catalog-exact-match`, `finalize-quality-gate` |
| Portal sync | `gestionale-sync-scope-coverage` |
| Metadata | `page-metadata-policy` |
| Numeric input | `numeric-input-anti-patterns` (extended/cert tier) |

---

## Anti-drift

The contract conformance test fails if:

- A required control is removed from legacy or Control Plane without updating the contract
- Severity classification drifts between contract and registry
- A critical surface loses declared coverage

Run locally:

```bash
npx tsx lib/control/release-ready-contract.test.ts
```

---

## Deprecated local entrypoints

| Script | Status |
|--------|--------|
| `npm run release:gate` | **DEPRECATED** — NOT merge authority; use `npm run control:local` |

Do not remove `release:gate` until usage audit confirms zero dependents.

---

See also: [`release-gate.md`](./release-gate.md), [`gate-matrix.md`](./gate-matrix.md), [`control-plane/README.md`](./control-plane/README.md).
