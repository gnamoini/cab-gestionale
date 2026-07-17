# Performance Documenti v3 — Implementations

**Date:** 2026-07-16

| ID | File | Intervento | Beneficio |
|----|------|------------|-----------|
| A1 | `app/(gestionale)/documenti/page.tsx` | `prefetchCriticalPage` + `Suspense` + `DocumentiDeferredHydration` | TTFB shell streamabile |
| A1 | `components/gestionale/documenti/documenti-deferred-hydration.tsx` | RSC deferred prefetch boundary | BFF in secondo boundary |
| A2 | `lib/bff/documenti-page-fetch-server.ts` | alias `fetchDocumentiPageDTOServer` | Naming allineato v3 + policy test |
| A2 | `src/lib/react-query/prefetch-gestionale-page.ts` | import alias BFF | Invariato seed 3 query |
| B1 | `src/hooks/gestionale/use-entity-list-queries.ts` | `useDocumentiListQuery` → `useSharedEntityQuery` + `documenti.list` | Dedup hydration lista |
| B2 | `src/hooks/gestionale/use-entity-list-queries.ts` | `useMezziListQuery(list)` → `useSharedEntityQuery` + `mezzi.list` | Dedup mezzi su `/documenti` |
| C1 | `documenti-view.tsx` | `dynamic()` filter panel + `filtriEspansi` gate | Bundle −filtri fino a expand |
| C2 | `components/gestionale/documenti/documenti-log-drawer.tsx` | log drawer estratto + lazy | Chunk log on demand |
| D1 | `lib/documenti/use-documenti-list-derived.ts` | haystack + filtered view wrapper | CPU search O(n) precompute |
| D2 | `lib/documenti/documenti-list-ui-filters.ts` | `buildDocumentiSearchHaystackById`; rimosso `countByMarca` morto | Meno lavoro inutile |
| D3 | `components/gestionale/documenti/documenti-helpers.ts` | tree index O(n) + lookup per marca | CPU tree vs O(catalog×docs) |
| D4 | `documenti-view.tsx` | consumer `useDocumentiListDerived` | View più snella |
| — | `lib/regression/documenti-perf-policy.test.ts` | Policy regression | CI guard |
| — | `lib/regression/waterfall-roi-audit.test.ts` | assert BFF + deferred hydration | Waterfall guard |

## Fuori scope (residuo)

- Monolite `documenti-view.tsx` (~1.2k LOC)
- Full-list fetch documenti (no server pagination)
- Virtualizzazione righe nell’albero espanso
- `documenti-modals.tsx` chunk interno al lazy boundary
- Lavorazioni `useDocumentiByLavorazione` — altro dominio
