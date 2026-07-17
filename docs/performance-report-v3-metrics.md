# Performance Report v3 — Metrics SSOT

**Date:** 2026-07-16  
**Domain:** `/report`

## Before (v3 start)

| Metrica | Valore |
|---------|--------|
| SSR pattern | blocking `prefetchReportPage()` (settings + BFF 6-wave) |
| Deferred hydration | assente |
| BFF pagina | `fetchReportDataDTOServer` con `cache()` — già presente |
| Query ownership | registry ok; client hooks report variant senza `ownershipScopeKey` |
| Economic queries | preventivi + invoices sempre fetch in `useReportDerivedPrefetch` |
| Bundle | modali eager in chunk sezione lavorazioni/magazzino |
| Section lazy | `loadReportSection()` + `unmount-on-close` — già ok |
| Baseline payload | 16.08 KB / 6 queries |

## After (v3 target)

| Metrica | Valore |
|---------|--------|
| SSR pattern | critical settings + Suspense + `ReportDeferredHydration` |
| BFF | invariato — `fetchReportDataDTOServer` |
| Hydration dedup | ownership su lav/mezzi/mag/movimenti/manual report scopes |
| Economic cold load | 0 query extra finché sezioni economiche chiuse |
| Bundle | lazy modali sezione |
| CPU | `useReportLiveDataDerived` |
| Policy tests | `report-perf-policy` |

## Verifica 2026-07-16

| Check | Esito |
|-------|-------|
| `npm run build` | PASS |
| `report-perf-policy.test.ts` | PASS |
| `waterfall-roi-audit.test.ts` | PASS |
| `performance-policy.test.ts` | PASS |

## Regenerate

```bash
npm run build
npx tsx lib/regression/report-perf-policy.test.ts
npx tsx lib/regression/waterfall-roi-audit.test.ts
npx tsx lib/regression/performance-policy.test.ts
```
