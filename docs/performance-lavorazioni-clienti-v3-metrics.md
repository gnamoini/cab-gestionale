# Performance Lavorazioni + Portale clienti v3 — Metrics SSOT

**Date:** 2026-07-16  
**Domain:** `/lavorazioni` (staff), `/lavorazioni-clienti` (portale)

## Before (v3 start)

| Metrica | Lavorazioni staff | Portale clienti |
|---------|-------------------|-----------------|
| Lista query path | legacy full-list (`includeMezzo: true` blocca RPC) | cold client dual L0 + L1 schede tutti gli ID |
| Mezzi al mount | cold `useMezziListQuery` | N/A (embed SQL lista) |
| SSR prefetch lista | attive + schede (deferred) | nessuno |
| Detail route chunk | N/A | static import detail view |
| Skeleton layers | Suspense + dynamic | loading.tsx + dynamic + barrier |
| Log mount | globale undo log | globale undo log (100 righe) |
| `lsdMode` | N/A | calcolato, non consumato |

## After (v3 target)

| Metrica | Lavorazioni staff | Portale clienti |
|---------|-------------------|-----------------|
| Lista query path | RPC paginato quando flag on (`includeMezzo: false` + enrich client) | SSR prefetch L0 + schede inCorso |
| Mezzi al mount | seed BFF `mezzi.list` | invariato (embed portale) |
| Modali view | lazy completamento + concurrency | lazy ingresso/contattaci/QR |
| Detail route | N/A | `ClientLavorazioneDetailViewLazy` |
| Skeleton | invariato (staff) | loading.tsx + barrier contract only |
| Log mount | invariato | gated su ingresso dialog |

## Verifica (2026-07-16)

- `npm run build` — PASS
- `lavorazioni-perf-policy.test.ts` — PASS
- `client-portal-perf-policy.test.ts` — PASS
- `performance-policy.test.ts` — PASS
- `client-portal-*-audit.test.ts` — PASS
- `lavorazioni-inputs-audit.test.ts` — FAIL pre-esistente (non in scope v3)

## Regenerate

```bash
npm run build
npx tsx lib/regression/lavorazioni-perf-policy.test.ts
npx tsx lib/regression/client-portal-perf-policy.test.ts
npx tsx lib/regression/performance-policy.test.ts
```
