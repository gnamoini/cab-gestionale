# Skeleton loading — baseline (post L1-only migration)

Data: 2026-07-22  
Artefatti storici: `test-results/skeleton-benchmark-transition-loader.json`

## Architettura L1 → L3

| Layer | Meccanismo | Stato |
|-------|------------|-------|
| LEVEL 1 | `loading.tsx` + structural skeleton | owner unico full-page |
| LEVEL 2 | `HydrationBoundary` + `prefetchGestionalePage` in page async | zero skeleton |
| LEVEL 3 | skeleton locali (widget, tabella, sezione) | layout stabile |

`PageTransitionLoader` (legacy LEVEL 2) ritirato — niente doppio skeleton route.

Prefetch deferred configurabile via `PAGE_PREFETCH_CONFIG` (es. `report: false`).

## Static gate — PASS

```bash
npx tsx lib/regression/loading-ownership-policy.test.ts
npx tsx lib/regression/page-layout-suspense-policy.test.ts
npx tsx lib/regression/loading-transition-fallback-policy.test.ts
npx tsx lib/regression/client-loading-boundary-policy.test.ts
```

## Hard refresh — before vs after (desktop 1440, dev)

| Route | blank before (ms) | blank after (ms) | clientChunk (ms) | transition (ms) | interactive (ms) | skeletonToInteractive (ms) | layoutShift |
|-------|------------------:|-----------------:|-----------------:|----------------:|-----------------:|---------------------------:|------------:|
| /dashboard | 879 | 346 | 349 | — | 1337 | 721 | — |
| /magazzino | 1499 | 406 | 395 | 490 | 2004 | 1106 | 0px |
| /lavorazioni | 2086 | 443 | 446 | 184 | 5853* | 1454 | 0px |

\*lavorazioni interactive alto in dev (compile/HMR) — non gate skeleton.

**Prima:** `fallback={null}` → gap bianco post-`loading.tsx`.  
**Dopo:** structural skeleton + `PageLayout` fuori Suspense — continuità visiva LEVEL 1→2, `transitionLayoutShiftPx ≈ 0`, `blankAfterLoadingMs < 500` su tutte e tre le route rollout.

## Soft navigation — PASS

| Route | interactive (ms) | blankAfterLoading (ms) |
|-------|-----------------:|-----------------------:|
| /magazzino | 169 | 0 |
| /lavorazioni | 153 | 0 |

## Throttle Fast3G + CPU 4x (osservazione, non gate PR)

| Route | transition (ms) | interactive (ms) | skeletonToInteractive (ms) | layoutShift |
|-------|----------------:|-----------------:|-----------------------------:|------------:|
| /dashboard | 1863 | 7923 | 6731 | 0px |
| /lavorazioni | 9353 | 15153 | 14588 | 0px |

## KPI matrix (questo ticket)

| KPI | Target | Esito |
|-----|--------|-------|
| Skeleton owner ≤1 | ≤1 | PASS |
| PageHeader visible | <300ms | PASS |
| `blankAfterLoadingMs` hard | <500ms | PASS |
| `transitionLoaderMs` | se gap | PASS |
| `transitionLayoutShiftPx` | ≈0 | PASS |
| Policy LEVEL 2 | PASS | PASS |
| `interactiveMs` alto | misurato | LEVEL 3 |

## Bundle audit (LEVEL 3 input)

```bash
npm run analyze   # ANALYZE=true + next build — report HTML in .next
```

Chunk lazy SSOT: `components/gestionale/lazy-route-views.tsx`

| View | import target |
|------|---------------|
| `DashboardViewLazy` | `@/components/dashboard/dashboard-view` |
| `MagazzinoViewLazy` | `@/components/gestionale/magazzino/magazzino-view` |
| `LavorazioniViewLazy` | `@/components/gestionale/lavorazioni/lavorazioni-view` |

Interpretazione: skeleton + transition ok ma `interactiveMs` / `skeletonToInteractiveMs` alti → Caso B (bundle/hydration), non rework skeleton.

## Comandi benchmark

```bash
npx tsx scripts/bench/skeleton-runtime-benchmark.ts --base-url=http://localhost:3000
npx tsx scripts/bench/skeleton-runtime-benchmark.ts --base-url=http://localhost:3000 --throttle
```
