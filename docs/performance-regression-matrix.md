# Performance Regression Matrix (v3)

**Frozen:** Sprint 0 Measurement Lock  
**SSOT:** target TTI, JS, INP, filter latency per route × dataset  
**CI:** `control:pr` (staging-small), `control:staging` (staging-large), `control:cert` (memory + throttle)

## Ambienti dataset

| Ambiente | Lavorazioni | Magazzino | Uso |
| -------- | ----------- | --------- | --- |
| dev | variabile | variabile | debug, Profiler, provider cost map |
| staging-small | 100 / 500 | 100 / 500 | `control:pr` |
| staging-large | 2000 | 2000 / 5000 | `control:staging`, `control:cert` |

## Cold load — TTI + JS

| Route | Dataset | Target interactive | Target JS | Sprint gate |
| ----- | ------- | -----------------: | --------: | ----------- |
| `/dashboard` | normale | <2000 ms | <1500 KB | S0 baseline |
| `/lavorazioni` | 500 | <3000 ms (S1) / <2500 ms (S2) | <1500 KB | S1 RPC |
| `/lavorazioni` | 2000 | <3500 ms | <1500 KB | staging |
| `/magazzino` | 500 | <2500 ms | <1500 KB | S0 |
| `/magazzino` | 2000 | <3000 ms | <1500 KB | staging |
| `/magazzino` | 5000 | <3500 ms + server index | <1500 KB | cert |
| `/lavorazioni-clienti` | 100 | <2500 ms | <1400 KB | S1 archivio |
| Shell | — | — | ≤1500 KB goal / **≤1600 KB min** | S2 |

## Network — Lavorazioni RPC (Sprint 1, split target)

| Metrica | Pass | Fail |
| ------- | ---- | ---- |
| Payload lista | ∝ page size | >2× page size |
| Query RPC p95 | <300 ms | >500 ms |
| Runtime interactive | <3000 ms (S1) | >3500 ms post-RPC |

Runtime <2500 ms = **Sprint 2** (post-shell), non gate RPC.

## Filter latency (main thread)

| Route | Dataset | Target | Gate |
| ----- | ------- | -----: | ---- |
| `/magazzino` | 500 | <50 ms | WARN |
| `/magazzino` | 2000 | <100 ms | FAIL |
| `/lavorazioni` search | 500 | <100 ms | WARN |
| `/lavorazioni` search | 2000 | server search | FAIL |

## INP — interaction latency

| Route | Azione | Target INP |
| ----- | ------ | ---------: |
| `/lavorazioni` | filtro avanzato | <200 ms |
| `/lavorazioni` | ricerca post-debounce | <200 ms |
| `/lavorazioni` | kanban drag | <100 ms |
| `/magazzino` | ricerca live | <200 ms |
| `/dashboard` | toggle widget | <200 ms |
| `/lavorazioni-clienti` | expand archivio | <200 ms |

## Memory + React Query cache

| Check | Target |
| ----- | ------ |
| Δ heap post-nav 3 route | <30 MB |
| Detached DOM dopo 30s idle | <50 |
| RQ serialized WARN | >10 MB |
| RQ serialized FAIL | >30 MB |

Script: `npm run bench:memory`

## Delta CI

WARN +10%, FAIL +20% (`PERFORMANCE_REGRESSION_FAIL_PCT`).

## Baseline dev (pre-fix, 2026-07-19)

| Route | interactive | throttle |
| ----- | ----------: | -------: |
| `/dashboard` | 1394 ms | 8000 ms |
| `/magazzino` | 1960 ms | — |
| `/lavorazioni` | 4594 ms | 16092 ms |
| soft `/lavorazioni` | 256 ms | — |

Artefatti: `test-results/skeleton-benchmark-*.json`, `docs/performance-profiler-baseline.md`

## Post-v3 candidate (2026-07-19, git `91a7007`)

**Decision gate:** `prod-candidate` (`next build` + `next start` :3001). Dettaglio: [`post-v3-results.md`](post-v3-results.md).

| Route | dev-baseline | prod-candidate | Tier |
| ----- | -----------: | -------------: | ---- |
| `/dashboard` | 1394 ms | 908 ms | Pass |
| `/lavorazioni` | 4594 ms | 1054 ms | Pass (<2500) |
| `/magazzino` | 1960 ms | 680 ms | Pass |
| Shell `firstLoadJsKb` | 1793.6 | **1870.3** | **FAIL** (>1700) |

Lavorazioni tiered: Pass <2500 · Warning 2500–3500 · Fail >3500.

Memory trend 10 cicli: slope **0 MB/ciclo** (PASS). UX gate: PASS.
