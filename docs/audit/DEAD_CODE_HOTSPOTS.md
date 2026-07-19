# Dead Code Hotspots — Phase 9

> Generated 2026-07-19. Artifacts: `orphan-hotspots.json`, `barrel-entropy.json`, `debt-score-trend.json`

## Executive summary

Phase 9 **classifies** architectural debt — it does not target zero orphans.

| Metric | Value |
|--------|------:|
| Import graph nodes | 4045 |
| Orphan nodes (taxonomy) | 1233 |
| deadCandidate | 1233 |
| runtimeOnly | 0 |
| entryOnly (entry points) | 152 |
| High-confidence dead (production, score ≥85) | 0 |

**Realistic post-Phase 9 split:** ~300 safe dead / ~400 runtime-known / ~300 test-tooling / ~222 investigate.

Orphan taxonomy uses 4 states + `evidence[]` + `confidenceScore` (0–100). See [`dead-code-policy.md`](../maintenance/dead-code-policy.md).

---

## Hotspot Score formula (v4)

```
Hotspot Score =
  (sizeNormalized × 1)
+ (deprecatedExports × 3)
+ (legacyFlags × 5)
+ (runtimeFallbacks × 5)
+ min(runtimeCriticality × 5, 25)
```

- **sizeNormalized** = `deadCandidate_production / total_files_in_area`
- **maxCriticalityContribution** = 25 cap

### runtimeCriticality weights

| Domain | Weight |
|--------|-------:|
| RBAC / auth | 5 |
| billing / fatturazione | 5 |
| notifications | 4 |
| workflow / lavorazioni | 4 |
| UI / design-system | 1 |

---

## Hotspot ranking

| Priority | Area | Orphans | Notes |
|----------|------|--------:|-------|
| **P1** | lib/notifications | 12 | legacy flags + fallbacks; operational criticality |
| **P1** | lib/pdf | 8 | registry dynamic routes |
| **P2** | lib/magazzino | 38 | compat layer (Bucket 3) |
| **P2** | lib/lavorazioni | 36 | workflow domain |
| **P3** | components/design-system | 39 | barrel entropy — public API risk |
| **P3** | lib/report | 35 | metric registry growth |
| **P4** | lib/regression | 365 | test/tooling — not delete candidates |
| **P4** | scripts | 138 | tooling orphans |

P1–P2: sunset docs + telemetry before any delete.  
P3: barrel entropy review (`audit:barrel-entropy`).  
P4: classify as test/tooling; exclude from Cat A.

---

## Barrel entropy highlights

Run: `npm run audit:barrel-entropy`

| Barrel | Owner | Visibility | Risk |
|--------|-------|------------|------|
| `components/design-system/index.ts` | design-system | public-barrel | high |
| `components/design-system/loading/index.ts` | design-system | public-barrel | high |
| `components/report/design-system/index.ts` | report | domain-barrel | medium |

**Rule:** `directImports=0` AND `barrelImports>0` → `active-via-barrel` — never Cat A delete.

---

## RBAC RCA (PR-1)

| Item | Result |
|------|--------|
| Failure | `operatore /dashboard` expected true — **stale test** |
| Root cause | Seed + migration set `dashboard: none` for operatore |
| Classification | pre-existing |
| Fix | `rbac-route-matrix.test.ts` aligned with SSOT |
| Artifacts | `artifacts/audit/rbac-rca/` |

---

## Recommendations

1. **Bucket 1 (Cat A):** only `confidenceScore ≥ 85` + manifest verify — none auto-qualified in production yet
2. **Bucket 2:** migrate `@deprecated` consumers (310 remaining)
3. **Bucket 3:** follow [`docs/migrations/sunset/README.md`](../migrations/sunset/README.md) — 8 systems documented
4. **No bulk knip delete** — 672 advisory files; delta PR gate only

---

## Debt score trend

| Phase | Score | Delta |
|-------|------:|------:|
| baseline | 6003 | — |
| phase5 | 5926 | -1.3% |
| phase9 | 5960 | -0.7% |

See `artifacts/audit/dead-code-baseline/debt-score-trend.json`.
