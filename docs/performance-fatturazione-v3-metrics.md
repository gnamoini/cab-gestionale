# Performance Fatturazione v3 — Metrics SSOT

**Date:** 2026-07-16  
**Domain:** `/fatturazione` (9 tab hub)

## Before (v3 start)

| Metrica | Valore |
|---------|--------|
| SSR pattern | blocking `prefetchFatturazionePage()` (lista fatture completa) |
| Deferred hydration | assente |
| BFF pagina | assente |
| Lista hook | `useServiceQuery` senza `ownershipScopeKey` |
| Tab secondarie | open-items / payments solo client al mount tab |
| Cross-domain | preventivi + DDT + log sempre on mount |
| Bundle | detail drawer (~3.6k LOC) + 3 tab fase-1 + filter eager |
| CPU filter lista | `invoiceListContextForRow()` O(n×m) |

## After (v3 target)

| Metrica | Valore |
|---------|--------|
| SSR pattern | critical (no-op) + Suspense + `FatturazioneDeferredHydration` |
| BFF | `fetchFatturazionePageDTOServer` |
| Hydration dedup | `ownershipScopeKey: fatturazione.list` (+ openItems/payments) |
| Tab SSR secondarie | solo deep link `?tab=scadenziario` / `?tab=pagamenti` |
| Cross-domain | gate wizard / log |
| Bundle | lazy detail, payment, log, filter, tab fase-1 |
| CPU filter | `buildInvoiceListContextMaps` via `useFatturazioneListDerived` |
| Policy tests | `fatturazione-perf-policy` |

## Verifica 2026-07-16

| Check | Esito |
|-------|-------|
| `npm run build` | PASS |
| `fatturazione-perf-policy.test.ts` | PASS |
| `waterfall-roi-audit.test.ts` | PASS |

## Regenerate

```bash
npm run build
npx tsx lib/regression/fatturazione-perf-policy.test.ts
npx tsx lib/regression/waterfall-roi-audit.test.ts
```
