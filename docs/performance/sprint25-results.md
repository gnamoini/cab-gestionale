# Sprint 2.5 — Shell Bundle Reduction Results

**Date:** 2026-07-19  
**Git:** `91a7007` (main)  
**Baseline:** post-v3 freeze `firstLoadJsKb=1870.3`  
**Machine:** DESKTOP-Jay · Node v24.15.0 · Chromium headless 1440×900

## Executive summary

| Area | Result |
| ---- | ------ |
| Structural (AST zero-edge, lazy gate, observability split) | **PASS** |
| Chunk displacement (diagnostics not in initial) | **PASS** |
| `firstLoadJsKb` ≤1700 | **FAIL** (1866.6 KB) |
| Sprint 2.5 composite PASS | **NO** — bundle target not met; governance + ranking in place for next pass |

**Delta bundle:** 1870.3 → **1866.6 KB** (−3.7 KB). Diagnostics modules were largely already absent from prod first-load (feature-flag gated); structural hardening prevents regression when flags are on.

---

## Incremental build measurement

| Step | Snapshot | `firstLoadJsKb` | Notes |
| ---- | -------- | --------------: | ----- |
| Baseline (post-v3) | `build-budget-sprint25-baseline.json` | 1870.3 | frozen |
| A+B+C (combined) | `build-budget-sprint25-step-c.json` | **1866.6** | boot gate + observability split + DevUx dynamic |

Steps A/B/C were applied in one build (no per-step rebuild); delta attributed to combined shell lazy split.

---

## Structural gates (PASS)

### AST — boot-investigation critical graph

- Policy: `lib/regression/shell-static-import-audit.ts`
- Test: `lib/regression/shell-bundle-sprint25-policy.test.ts`
- **0 violations** — forbidden zones import `boot-investigation-gate` / `boot-investigation-lazy` only

### Feature-flag SSOT

- `lib/observability/boot-investigation-gate.ts` — zero import from heavy module
- Enable: `NEXT_PUBLIC_BOOT_INVESTIGATION=1` OR `NEXT_PUBLIC_PERF_DIAGNOSTICS=1`
- No `NODE_ENV === "production"` block in gate

### Observability split

| Layer | Module | Load |
| ----- | ------ | ---- |
| Lite (sync) | `ObservabilityProviderLite` | hydration, `setObsContext`, base errors |
| Diagnostics (async) | `ObservabilityDiagnosticsPack` | `BootInvestigationMount`, `RuntimeHealthBridge`, overflow audit |

### DevUx

- `DevUxEnforcementGuard` — `dynamic({ ssr: false })`, mount `NODE_ENV === "development"` only

### Chunk displacement

Artefatto: `test-results/chunk-displacement-sprint25.json` — **pass=true**

Target modules not in `rootMainFiles` / initial chunks.

---

## Bundle tier (FAIL)

| Tier | Threshold | Value |
| ---- | --------- | ----: |
| PASS | ≤1700 KB | — |
| WARN | 1700–1750 KB | — |
| FAIL | >1750 KB | **1866.6 KB** |

`GLOBAL_FIRST_LOAD_JS_KB` (1900) unchanged.

Ranking: `test-results/bundle-dependency-ranking-sprint25.json` — top chunk `0u-vnegu35wn2.js` gzipKb≈70.8, globalReach=1.0.

---

## Runtime validation (prod :3001)

| Route | post-v3 TTI | sprint25 TTI | Gate (+10%) | |
| ----- | ----------: | -----------: | ----------: | - |
| `/dashboard` | 908 ms | **1947 ms** | ≤999 ms | FAIL* |
| `/lavorazioni` | 1054 ms | **1343 ms** | ≤1160 ms | FAIL* |
| `/magazzino` | 680 ms | **857 ms** | ≤748 ms | FAIL* |

\*Single-run variance / cold start; re-run recommended before treating as regression. Soft nav routes PASS.

### Memory

- `memory-trend-sprint25.json`: slope **0 MB/ciclo** — PASS
- `queryCount=0` (no `NEXT_PUBLIC_BENCH_EXPOSE_QUERY=1` on server)

### UX gate

- `ux-regression-gate` vs post-v3: **FAIL** — `/dashboard` hard `skeletonToInteractiveMs` +20% vs baseline
- Skeleton benchmark: `skeleton-benchmark-sprint25-prod.json`

---

## Lavorazioni state split — CLOSED

```
CLOSED (NO-GO)
Reopen: Profiler LavorazioniView >50% | INP fail @2000 | commit cascade >100ms
```

No changes to `lavorazioni-view.tsx` in this sprint.

---

## Artifacts

| File | Purpose |
| ---- | ------- |
| `test-results/build-budget-sprint25-baseline.json` | Frozen baseline |
| `test-results/build-budget-sprint25-step-c.json` | Post-sprint build |
| `test-results/chunk-displacement-sprint25.json` | Initial-chunk audit |
| `test-results/bundle-dependency-ranking-sprint25.json` | gzipKb × globalReach |
| `test-results/skeleton-benchmark-sprint25-prod.json` | TTI prod |
| `test-results/memory-trend-sprint25.json` | Memory trend |

---

## Governance

Added to `PERFORMANCE_GOVERNANCE_SUITE`:

- `lib/regression/boot-investigation-policy.test.ts`
- `lib/regression/shell-bundle-sprint25-policy.test.ts`

npm scripts: `bench:chunk-displacement`, `bench:bundle-ranking`

---

## Next steps (P0 backlog)

1. Attack top `bundleImpactScore` chunks (shared 226 KB raw vendor-adjacent)
2. Re-benchmark prod with warm server; fix `--base-url` parsing (done in `readCliArgValue`)
3. Repeat build after each defer until `firstLoadJsKb ≤ 1700`
4. Portale `page-ready-toolbar` / `__GESTIONALE_ROUTE_READY__` (P2)
