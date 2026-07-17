# Performance Dipendenti v3 — Metrics SSOT

**Date:** 2026-07-16  
**Domain:** `/dipendenti`

## Before (v3 start)

| Metrica | Valore |
|---------|--------|
| SSR pattern | blocking `prefetchDipendentiPage()` |
| Deferred hydration | assente (deferred no-op) |
| BFF pagina | assente |
| Hook | `useServiceQuery` waterfall settings→employees→entries |
| Bundle | editor + detail modal eager |
| Grid | `useVirtualizer` già attivo (>15 righe) |

## After (v3 target)

| Metrica | Valore |
|---------|--------|
| SSR pattern | critical settings + Suspense + `DipendentiDeferredHydration` |
| BFF | `fetchDipendentiPageDTOServer` |
| Hydration dedup | `dipendenti.employees` / `entries` / `monthKeys` via `useSharedEntityQuery` |
| Bundle | lazy editor + detail modal |
| CPU | `useDipendentiTimesheetDerived` |
| Month nav | prefetch mese ±1 |
| Policy tests | `dipendenti-perf-policy` |

## Verifica 2026-07-16

| Check | Esito |
|-------|-------|
| `npm run build` | PASS |
| `dipendenti-perf-policy.test.ts` | PASS |
| `waterfall-roi-audit.test.ts` | PASS |
| `performance-policy.test.ts` | PASS |

## Regenerate

```bash
npm run build
npx tsx lib/regression/dipendenti-perf-policy.test.ts
npx tsx lib/regression/waterfall-roi-audit.test.ts
npx tsx lib/regression/performance-policy.test.ts
```
