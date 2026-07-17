# Performance Dipendenti v3 — Implementations

**Date:** 2026-07-16

| ID | File | Intervento | Beneficio |
|----|------|------------|-----------|
| A1 | `app/(gestionale)/dipendenti/page.tsx` | `prefetchCriticalPage` + `Suspense` + `DipendentiDeferredHydration` | TTFB shell streamabile |
| A1 | `components/gestionale/dipendenti/dipendenti-deferred-hydration.tsx` | RSC deferred prefetch boundary | BFF in secondo boundary |
| A2 | `lib/dipendenti/dipendenti-timesheet-fetch-server.ts` | fetch server employees/entries/monthKeys | RBAC + colonne light |
| A2 | `lib/bff/dipendenti-page-fetch-server.ts` | `fetchDipendentiPageDTOServer` parallel | Request-scoped BFF |
| A2 | `src/lib/react-query/prefetch-gestionale-page.ts` | `seedPrefetchedData` × 3 query | Hydration dedup |
| B1 | `lib/render/query-ownership-registry.ts` | scopes `dipendenti.*` | Skip client refetch |
| B2 | `src/hooks/gestionale/use-dipendenti-timesheet-queries.ts` | `useSharedEntityQuery` wrappers | Dedup hydration |
| B2 | `src/hooks/use-dipendenti-timesheet.ts` | consumer query wrappers | Waterfall ridotto |
| C1 | `dipendenti-view.tsx` | `dynamic()` editor + detail modal | Bundle −modali on demand |
| D1 | `lib/dipendenti/use-dipendenti-timesheet-derived.ts` | entries index + display list | CPU hook snello |
| E1 | `lib/dipendenti/prefetch-dipendenti-month-entries.ts` | prefetch mese ±1 | Cache hit navigazione |
| E2 | `dipendenti-view.tsx` | `useEffect` prefetch adiacente | UX mese fluida |
| — | `lib/regression/dipendenti-perf-policy.test.ts` | Policy regression | CI guard |
| — | `lib/regression/waterfall-roi-audit.test.ts` | assert BFF + deferred | Waterfall guard |

## Fuori scope (residuo)

- Split `dipendenti-timesheet-grid.tsx` (~840 LOC)
- Virtualizzazione colonne giorni
- Server pagination entries annuali
- Cross-domain report KPI hooks
