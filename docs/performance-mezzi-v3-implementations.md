# Performance Mezzi v3 — Implementations

**Date:** 2026-07-16

| ID | File | Intervento | Beneficio |
|----|------|------------|-----------|
| A1 | `app/(gestionale)/mezzi/page.tsx` | `prefetchCriticalPage` + `Suspense` + `MezziDeferredHydration` | TTFB shell streamabile |
| A1 | `components/gestionale/mezzi/mezzi-deferred-hydration.tsx` | RSC deferred prefetch boundary | BFF in secondo boundary |
| A2 | `lib/bff/mezzi-page-fetch-server.ts` | `fetchMezziPageDTOServer` + `cache()` | BFF request-scoped |
| A2 | `src/lib/react-query/prefetch-gestionale-page.ts` | `seedPrefetchedData` + BFF mezzi | Hydration dedup `mezzi.list` |
| C1 | `mezzi-view.tsx` | `dynamic()` filter panel + `filtriEspansi` gate | Bundle −filtri fino a expand |
| C2 | `components/gestionale/mezzi/mezzi-log-drawer.tsx` | log drawer estratto + lazy | Chunk log on demand |
| C3 | `mezzi-view.tsx` | `MezziEditModal` lazy | Chunk edit on demand |
| D1 | `lib/mezzi/use-mezzi-list-derived.ts` | filter + sort + interventi index | CPU client-side, view snella |
| D2 | `lib/mezzi/interventi-from-lavorazioni-db.ts` | `buildInterventiByMezzoIdFromLavorazioni` | O(lav + mezzi×orphans) vs O(mezzi×lav) |
| D3 | `lib/mezzi/mezzi-list-fetch.ts` | `cliente`/`targa`/`numero_scuderia` in `filterMezziGestiti` | Parità con query key stabile |
| D4 | `mezzi-view.tsx` | `useMezziListQuery(undefined)` sempre warm | Zero refetch su filtro debounced |
| E1 | `mezzi-tagliandi-matrix-table.tsx` | lista da cache + `mezzoTagliandiEnabled` filter | Elimina query key duplicata |
| E2 | `lib/mezzi/prefetch-mezzi-tagliandi-queries.ts` | prefetch catalog/plans/services-lite | Parallel load al switch tab |
| E3 | `mezzi-tagliandi-matrix-table.tsx` | `virtualRows` su matrice | DOM viewport-only su righe |
| — | `lib/regression/mezzi-perf-policy.test.ts` | Policy regression | CI guard |
| — | `lib/regression/waterfall-roi-audit.test.ts` | assert BFF + deferred hydration | Waterfall guard |

## Fuori scope (residuo)

- Monolite `mezzi-view.tsx` (~800 LOC)
- Full-list fetch mezzi (no server pagination)
- Virtualizzazione mobile cards in `MezziTable`
- Split hub modal (~605 LOC)
- `MezziRegistraTagliandoModal` lazy in hub tab (P2)
