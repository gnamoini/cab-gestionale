# Performance Documenti v3 — Metrics SSOT

**Date:** 2026-07-16  
**Domain:** `/documenti`

## Before (v3 start)

| Metrica | Valore |
|---------|--------|
| SSR pattern | blocking `prefetchDocumentiPage()` (settings + mezzi + documenti) |
| Deferred hydration | assente |
| BFF pagina | `getDocumentiDashboardDTOServer` (3 query parallele) |
| Lista hook | `useServiceQuery` senza `ownershipScopeKey` |
| Mezzi hook | `useServiceQuery` senza hydration skip su `/documenti` |
| Bundle | filter panel + log drawer eager in view |
| CPU filter/tree | haystack per doc per pass; tree O(catalog×docs) |

## After (v3 target)

| Metrica | Valore |
|---------|--------|
| SSR pattern | critical settings + Suspense + `DocumentiDeferredHydration` |
| BFF | `fetchDocumentiPageDTOServer` (alias) |
| Hydration dedup | `documenti.list` + `mezzi.list` via `useSharedEntityQuery` |
| Bundle | lazy filter + log drawer |
| CPU | `useDocumentiListDerived` + tree index |
| Policy tests | `documenti-perf-policy` |

## Verifica 2026-07-16

| Check | Esito |
|-------|-------|
| `npm run build` | PASS |
| `documenti-perf-policy.test.ts` | PASS |
| `waterfall-roi-audit.test.ts` | PASS |
| `documenti-list-ui-filters.test.ts` | PASS |

## Regenerate

```bash
npm run build
npx tsx lib/regression/documenti-perf-policy.test.ts
npx tsx lib/regression/waterfall-roi-audit.test.ts
```
