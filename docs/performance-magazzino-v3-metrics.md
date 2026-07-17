# Performance Magazzino v3 — Metrics SSOT

**Date:** 2026-07-16  
**Domain:** `/magazzino` only

## Before (v3 start)

| Metrica | Valore |
|---------|--------|
| SSR pattern | blocking `prefetchMagazzinoPage()` (settings + lista sequenziali) |
| Deferred hydration | assente |
| BFF pagina | assente (`getMagazzinoListServer` diretto) |
| Lista hook | `useServiceQuery` senza `ownershipScopeKey` |
| Bundle view | filtri avanzati + log drawer eager |
| Client derived | 4–6 full-array scan separati su `prodotti` |
| Baseline payload | 7.43 KB ([`performance-regression-report.md`](performance-regression-report.md)) |
| Baseline queries | 2 |

## After (v3 target)

| Metrica | Valore |
|---------|--------|
| SSR pattern | critical settings + Suspense + `MagazzinoDeferredHydration` |
| BFF | `fetchMagazzinoPageDTOServer` |
| Hydration dedup | `ownershipScopeKey: magazzino.list` |
| Bundle | lazy filtri avanzati + log drawer |
| Derived | `useMagazzinoListDerived` single-pass |
| Policy tests | `magazzino-perf-policy` |

## Verifica 2026-07-16

| Check | Esito |
|-------|-------|
| `npm run build` | PASS |
| `magazzino-perf-policy.test.ts` | PASS |
| `performance-policy.test.ts` | PASS |
| `magazzino-nuovo-ricambio-e2e-audit.test.ts` | PASS |
| `magazzino-inputs-audit.test.ts` | FAIL pre-esistente (`<select` in audit bundle) |

## Regenerate

```bash
npm run build
npx tsx lib/regression/magazzino-perf-policy.test.ts
npx tsx lib/regression/performance-policy.test.ts
```
