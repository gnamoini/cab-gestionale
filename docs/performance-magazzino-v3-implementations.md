# Performance Magazzino v3 — Implementations

**Date:** 2026-07-16

| ID | File | Intervento |
|----|------|------------|
| A1 | `app/(gestionale)/magazzino/page.tsx` | `prefetchCriticalPage` + `Suspense` + `MagazzinoDeferredHydration` |
| A1 | `components/gestionale/magazzino/magazzino-deferred-hydration.tsx` | RSC deferred prefetch boundary |
| A2 | `lib/bff/magazzino-page-fetch-server.ts` | BFF `fetchMagazzinoPageDTOServer` con `cache()` |
| A2 | `src/lib/react-query/prefetch-gestionale-page.ts` | case `magazzino` → BFF + `seedPrefetchedData` |
| B1 | `src/hooks/gestionale/use-entity-list-queries.ts` | `useSharedEntityQuery` + `ownershipScopeKey: magazzino.list` |
| C1 | `components/gestionale/magazzino/magazzino-view.tsx` | Rimosso dead import `lavorazioni-shared` |
| C2 | `components/gestionale/magazzino/magazzino-view.tsx` | `dynamic()` `MagazzinoAdvancedFilterPanel`, mount se `filtriEspansi` |
| C3 | `components/gestionale/magazzino/magazzino-log-drawer.tsx` | Drawer log estratto |
| C3 | `components/gestionale/magazzino/magazzino-view.tsx` | `dynamic()` log drawer, mount se `logOpen` |
| D1 | `lib/magazzino/use-magazzino-list-derived.ts` | Single-pass derived su `prodotti` |
| D1 | `components/gestionale/magazzino/magazzino-view.tsx` | Consumer `useMagazzinoListDerived` |
| D2 | `components/gestionale/magazzino/magazzino-view.tsx` | `needConsumoMap` gate su `buildConsumoMapMagazzinoRolling36ForProducts` |
| — | `lib/regression/magazzino-perf-policy.test.ts` | Policy regression |
| — | `docs/performance-magazzino-v3-metrics.md` | Before/after SSOT |

## Fuori scope (residuo)

- Full-list fetch server-side (no RPC paginazione magazzino)
- Split `magazzino-desktop-table-island` (E2 opzionale)
- Monolite `magazzino-view.tsx` (~2k LOC)
