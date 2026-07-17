# Performance Preventivi v3 — Metrics SSOT

**Date:** 2026-07-16  
**Domain:** `/preventivi` (+ tab Ordini fornitori)

## Before (v3 start)

| Metrica | Valore |
|---------|--------|
| SSR pattern | blocking `prefetchPreventiviPage()` (preventivi + ordini paralleli) |
| Deferred hydration | assente |
| BFF pagina | assente |
| Lista hook | `useServiceQuery` senza `ownershipScopeKey` |
| Billing | client-only `usePreventiviBillingQuery` (+1 RTT) |
| Ordini SSR | sempre prefetch anche su tab preventivi |
| Bundle | `OrdiniFornitoriView` + filtri + editor modal eager in tree |
| Baseline preventivi query | 1 embed mezzi ([`waterfall-roi-report.md`](waterfall-roi-report.md)) |

## After (v3 target)

| Metrica | Valore |
|---------|--------|
| SSR pattern | critical settings + Suspense + `PreventiviDeferredHydration` |
| BFF | `fetchPreventiviPageDTOServer` |
| Hydration dedup | `ownershipScopeKey: preventivi.list` |
| Billing | SSR seed in BFF |
| Ordini SSR | solo deep link `?prevTab=ordini` |
| Bundle | lazy ordini tab, filtri, log drawer, DDT drawer |
| Policy tests | `preventivi-perf-policy` |

## Verifica 2026-07-16

| Check | Esito |
|-------|-------|
| `npm run build` | PASS |
| `preventivi-perf-policy.test.ts` | PASS |
| `performance-policy.test.ts` | PASS |
| `waterfall-roi-audit.test.ts` | PASS |
| `ordini-fornitori-isolation.test.ts` | PASS |
| `preventivi-inputs-audit.test.ts` | PASS |
| `preventivi-lavorazione-id-orchestration.test.ts` | PASS |

## Regenerate

```bash
npm run build
npx tsx lib/regression/preventivi-perf-policy.test.ts
npx tsx lib/regression/performance-policy.test.ts
npx tsx lib/regression/waterfall-roi-audit.test.ts
```
