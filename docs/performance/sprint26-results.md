# Sprint 2.6 — Shared Shell Dependency Reduction Results

**Date:** 2026-07-19  
**Git:** `91a7007` (main)  
**Baseline:** Sprint 2.5 `firstLoadJsKb=1866.6`  
**Machine:** DESKTOP-Jay · Node v24.15.0 · Chromium headless 1440×900

## Executive summary

| Area | Result |
| ---- | ------ |
| Ranking v3.1 (scoped reach, `firstLoadFactor`, `bundleImpactScore`) | **PASS** |
| Shared chunk analyzer + offender dossiers | **PASS** |
| Provider mount profile + `criticalProviderCount` baseline | **PASS** |
| Defer loop step 1 (FormUx) + displacement anti-placebo | **PASS** |
| AST boot-investigation (Sprint 2.5 inheritance) | **PASS** |
| `firstLoadJsKb` ≤1700 | **FAIL** (1833.3 KB) |
| Sprint 2.6 composite PASS | **NO** — −133 KB remaining to goal; frozen shell chunks dominate |

**Delta bundle:** 1866.6 → **1833.3 KB** (−33.3 KB, step 1 FormUx defer). Upload/Supabase/DataStale deferrals were structural (already absent from first-load); FormUx was the first measurable win.

---

## Incremental defer steps

| Step | Target | `firstLoadJsKb` | Δ KB | Displacement | Anti-placebo |
| ---- | ------ | --------------: | ---: | ------------ | ------------ |
| 0 (Sprint 2.5) | — | 1866.6 | — | PASS | — |
| Pre-step | Upload + Supabase banner + Data stale | 1868.1* | +1.5 | PASS | PASS |
| **1** | `FormUxBoundaryBootstrap` | **1833.3** | **−33.3** | PASS | PASS |

\*Pre-step regression from wrapper overhead before static-import fixes.

Artifact: `test-results/build-budget-sprint26-step-1.json`

---

## First-load offender analysis (post-analyzer)

Top shared chunks (worst route `/magazzino/carichi/nuovo`):

| Chunk | rawKb | Role | Policy |
| ----- | ----: | ---- | ------ |
| `11v0p_b7u1~uy.js` | 232 | supabase-client | keep (core auth) |
| `0u-vnegu35wn2.js` | 226 | react-framework | keep (vendor) |
| `0wf4lf16gv80n.js` | 217 | app-settings-domain | **freeze** |
| `0oxbmjz9.cpx3.js` | 129 | permissions-rbac | **freeze** |

Dossiers: `docs/performance/offenders/*.md`  
Analyzer: `test-results/shared-chunk-analysis-sprint26.json` (10 packages, fingerprint attribution)

**Conclusion:** further −133 KB to ≤1700 requires either (a) violating freeze on AppSettings/RBAC chunks, or (b) vendor-level splits with full attribution — not attempted in this sprint.

---

## Structural gates

### Ranking v3.1

- `test-results/bundle-dependency-ranking-sprint26.json` — schema 3.1, 274 chunks
- Baseline frozen: `test-results/bundle-dependency-ranking-sprint26-baseline.json`

### Displacement anti-placebo

- `test-results/chunk-displacement-sprint26.json` — **pass=true**
- All defer targets: `removedFromFirstLoad=true`, `newSharedChunk=false`

### Kill switches

- SSOT: `lib/performance/defer-flags.ts`
- Build: `NEXT_PUBLIC_*_DEFER`
- Runtime emergency: `window.__GESTIONALE_FEATURE_FLAGS__`

### Provider instrumentation

- `criticalProviderCount=5` (frozen definition: before `page-ready-toolbar`)
- Snapshot: `test-results/critical-provider-baseline-sprint26.json`
- Profile: `test-results/provider-mount-profile-sprint26.json`

---

## UX gates

| Gate | Result | Notes |
| ---- | ------ | ----- |
| `bench:ux-gate` vs post-v3 | **PASS** | |
| Dashboard TTUI (prod :3001) | 1640 ms | gate ≤999 — **FAIL** (pre-existing) |
| Lavorazioni TTUI | 788 ms | gate ≤1160 — **PASS** |
| `criticalProviderCount` regression | **PASS** | 5 → 5 |
| Skeleton layout shift | **FAIL** | `transitionLayoutShiftPx` 147 > 48 on dashboard/lavorazioni |

Artifact: `test-results/skeleton-benchmark-sprint26-ux-baseline.json`

---

## Governance

- Policy: `lib/regression/shell-bundle-sprint26-policy.test.ts`
- Suite: `lib/control/suites/performance-governance.suite.ts`
- Provider audit: `docs/performance/sprint26-provider-audit.md`

**Policy KB tier:** 1833.3 KB → **FAIL** (>1750 WARN threshold)

---

## Implemented defer targets

| Target | Component | Build flag | Status |
| ------ | --------- | ---------- | ------ |
| Upload tray | `DeferredUploadFeedbackShell` | `NEXT_PUBLIC_UPLOAD_TRAY_DEFER` | implemented |
| Supabase banner | `DeferredSupabaseConfigurationBanner` | `NEXT_PUBLIC_SUPABASE_BANNER_DEFER` | implemented |
| Data stale banner | `DeferredDataStaleBanner` | `NEXT_PUBLIC_DATA_STALE_BANNER_DEFER` | implemented |
| Form UX bootstrap | `DeferredFormUxBoundaryBootstrap` | `NEXT_PUBLIC_FORM_UX_BOOTSTRAP_DEFER` | **step 1 — measured win** |

---

## Risks residuali

| Rischio | Stato |
| ------- | ----- |
| Bundle placebo | mitigated — displacement gate PASS |
| FormUx defer → late interceptors | accepted — `useEffect` install async |
| KB goal | blocked by frozen AppSettings (217 KB) + RBAC (129 KB) chunks |
| Rollback | `NEXT_PUBLIC_*_DEFER=0` + rebuild; runtime flags for emergency mount off |

---

## Verdict

**Sprint 2.6 partial:** governance + analyzer + defer infrastructure **complete**; **one measured defer step** (−33 KB). Composite PASS on `firstLoadJsKb ≤1700` **not achieved** — recommend Sprint 2.7 focus on app-settings chunk attribution and settings payload slimming (freeze lift requires explicit RBAC review).

---

## Artifact index

```
test-results/build-budget-snapshot.json
test-results/build-budget-sprint26-step-1.json
test-results/bundle-dependency-ranking-sprint26.json
test-results/bundle-dependency-ranking-sprint26-baseline.json
test-results/shared-chunk-analysis-sprint26.json
test-results/package-duplicate-analysis-sprint26.json
test-results/chunk-displacement-sprint26.json
test-results/critical-provider-baseline-sprint26.json
test-results/provider-mount-profile-sprint26.json
test-results/skeleton-benchmark-sprint26-ux-baseline.json
docs/performance/sprint26-provider-audit.md
docs/performance/offenders/
lib/performance/defer-flags.ts
lib/regression/shell-bundle-sprint26-policy.test.ts
```
