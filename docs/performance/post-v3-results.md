# Post-v3 Validation Results

**Date:** 2026-07-19  
**Git:** `91a7007` (main)  
**Machine:** DESKTOP-Jay · Node v24.15.0 · Chromium headless 1440×900

## Environment matrix

| Label | Server | Artifact |
| ----- | ------ | -------- |
| dev-baseline (frozen pre-v3) | `npm run dev` | `test-results/skeleton-benchmark-dev-baseline.json` |
| dev-candidate | `npm run dev` :3000 | `test-results/skeleton-benchmark-post-v3-dev.json` |
| prod-candidate (decision gate) | `npm run build` + `next start` :3001 | `test-results/skeleton-benchmark-post-v3-prod.json` |

Ogni artifact include blocco `environment` (git, branch, nextMode, dataset, machine).

---

## Before / After — TTI hard nav (`ttuiMs`)

| Route | Env | Before | After | Delta | Tier |
| ----- | --- | -----: | ----: | ----: | ---- |
| `/dashboard` | dev-baseline → prod-candidate | 1394 ms | **908 ms** | −35% | Pass |
| `/lavorazioni` | dev-baseline → prod-candidate | 4594 ms | **1054 ms** | −77% | **Pass** (<2500) |
| `/magazzino` | dev-baseline → prod-candidate | 1960 ms | **680 ms** | −65% | Pass |
| `/lavorazioni-clienti` | — → prod soft | — | **47 ms** | — | Prima baseline soft |
| soft `/lavorazioni` | dev-baseline → prod | 256 ms | 690 ms | +169% | Investigate soft nav |

**Nota dev-candidate:** su `npm run dev`, `/lavorazioni` hard = 29411 ms (compilazione Turbopack) — **non usare dev per decision gate TTI**.

### Lavorazioni tiered gate

| Stato | Soglia | Risultato prod |
| ----- | ------ | -------------- |
| Pass | <2500 ms | **1054 ms** ✓ |
| Warning | 2500–3500 ms | — |
| Fail | >3500 ms | — |

### Throttle prod (`--throttle`)

| Route | ttuiMs |
| ----- | -----: |
| `/dashboard` | 1755 ms |
| `/lavorazioni` | 2033 ms |
| `/report` | 2364 ms |

Artefatto: `test-results/skeleton-benchmark-post-v3-prod-throttle.json`

---

## Bundle — Caso A

| Metrica | Before (2026-07-17) | After (post-v3 build) | Gate |
| ------- | ------------------: | --------------------: | ---- |
| `firstLoadJsKb` | 1793.6 | **1870.3** | **FAIL** (>1700) |
| `vendorChunkKb` | 443.3 | 443.3 | OK |
| `/lavorazioni` route JS | — | 1828.3 | — |

**Decisione:** **Caso A** — bundle aumentato (+76.7 KB). Defer realtime ha migliorato runtime, non il payload.  
**Backlog:** lazy `ObservabilityProvider`, `BootInvestigationMount`, dynamic import provider shell.

Artefatto: `test-results/build-budget-snapshot.json`

---

## Memory — GC-stabilized

| Check | Single cycle | 10-cycle trend |
| ----- | ------------ | -------------- |
| `heapUsedAfterGcMb` Δ T0→Tend | 0 MB | 0 MB (48.1 → 48.1) |
| slope | — | **0 MB/ciclo** |
| detached DOM | 0 | 0 |
| RQ serialized | 0* | 0* |

\* `queryCount=0`: server non avviato con `NEXT_PUBLIC_BENCH_EXPOSE_QUERY=1` — ripetere con env sul processo Next per audit RQ reale.

Artefatti: `memory-regression-post-v3.json`, `memory-trend-post-v3.json`

---

## UX regression gate

`npm run bench:ux-gate` — **PASS** (prod vs frozen dev-baseline)

| Metrica | Target | Esito |
| ------- | ------ | ----- |
| CLS | <0.1 | 0 su tutte le route misurate |
| blankAfterLoading | non peggiorare | OK vs baseline |
| skeletonToInteractive | non +20% | OK vs baseline |

**Warn:** `/magazzino` hard prod `transitionLayoutShiftPx=147` (>48 internal bench threshold) — monitorare CLS field.

---

## Profiler ranked chart

Template manuale: `test-results/profiler-ranked-post-v3.md`

**State split Lavorazioni:** **CLOSED (NO-GO)** — vedi [sprint25-results.md](./sprint25-results.md).

---

## Decision table

| Decisione | Stato | Evidenza |
| --------- | ----- | -------- |
| Shell lazy split | **Sprint 2.6 partial** | `firstLoadJsKb` 1833.3 (−33 KB FormUx defer); goal ≤1700 not met — see [sprint26-results.md](./sprint26-results.md) |
| State split Lavorazioni | **CLOSED (NO-GO)** | prod TTI Pass; reopen solo su Profiler >50% / INP / cascade |
| Pagination Magazzino | **BACKLOG** | dataset dev piccolo; TTI prod OK |
| Portale shell dedicata | **BACKLOG** | hard nav timeout toolbar; soft 47 ms OK |
| Memory leak | **PASS** | slope 0 MB/ciclo, detached 0 |
| UX regression | **PASS** | ux-gate OK; layout shift magazzino da monitorare |

---

## Artefatti

```
test-results/build-budget-snapshot.json
test-results/skeleton-benchmark-dev-baseline.json
test-results/skeleton-benchmark-post-v3-dev.json
test-results/skeleton-benchmark-post-v3-prod.json
test-results/skeleton-benchmark-post-v3-prod-throttle.json
test-results/memory-regression-post-v3.json
test-results/memory-trend-post-v3.json
test-results/profiler-ranked-post-v3.md
```

## Prossimi passi (solo backlog misurato)

1. Shell lazy split per riportare JS sotto 1700 KB
2. Ripetere memory con `NEXT_PUBLIC_BENCH_EXPOSE_QUERY=1` sul server
3. Profiler ranked su filtro lavorazioni prima di rivalutare state split
4. Staging-small/large quando ambiente seedato disponibile
