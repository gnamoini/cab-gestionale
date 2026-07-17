# Performance Mezzi v3 — Metrics SSOT

**Date:** 2026-07-16  
**Domain:** `/mezzi` (anagrafica + tagliandi/revisioni)

## Before (v3 start)

| Metrica | Valore |
|---------|--------|
| SSR pattern | blocking `prefetchMezziPage()` (lista mezzi) |
| Deferred hydration | assente |
| BFF pagina | `getMezziListLightServer()` diretto in prefetch |
| Lista hook | `useSharedEntityQuery` ok; view usa query key con filtri → refetch |
| Bundle | filter panel + edit modal + log drawer eager in view |
| CPU filter | `interventiByMezzoId` O(mezzi × lav) per pass |
| Tagliandi | query separata `{ tagliandi: "si" }`; matrice full DOM |

## After (v3 target)

| Metrica | Valore |
|---------|--------|
| SSR pattern | critical vuoto + Suspense + `MezziDeferredHydration` |
| BFF | `fetchMezziPageDTOServer` |
| Hydration dedup | `mezzi.list` via `seedPrefetchedData` + query key stabile |
| Bundle | lazy filter + edit + log drawer |
| CPU | `useMezziListDerived` + interventi index O(lav + mezzi×orphans) |
| Tagliandi | cache lista condivisa + prefetch maintenance + matrix virtualRows |
| Policy tests | `mezzi-perf-policy` |

## Verifica 2026-07-16

| Check | Esito |
|-------|-------|
| `npm run build` | PASS |
| `mezzi-perf-policy.test.ts` | PASS |
| `waterfall-roi-audit.test.ts` | PASS |
| `performance-policy.test.ts` | PASS |
| `mezzi-list-fetch.test.ts` | PASS |

## Regenerate

```bash
npm run build
npx tsx lib/regression/mezzi-perf-policy.test.ts
npx tsx lib/regression/waterfall-roi-audit.test.ts
npx tsx lib/regression/performance-policy.test.ts
npx tsx lib/mezzi/mezzi-list-fetch.test.ts
```
