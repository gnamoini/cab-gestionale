# Performance Impostazioni v3 — Metrics SSOT

**Date:** 2026-07-17  
**Domain:** `/impostazioni`

## Before (v3 start)

| Metrica | Valore |
|---------|--------|
| SSR pattern | blocking `prefetchImpostazioniPage()` |
| Critical prefetch | `getAppSettingsPayloadServer` (blocca TTFB) |
| Deferred hydration | no-op |
| Hook | `useCabAppSettingsPayloadQuery({ enabled: open })` |
| In-uso queries | 2 fetch al cold load (Overview) |
| Bundle | 17+ sezioni + modali eager nel workspace shell |

## After (v3 target)

| Metrica | Valore |
|---------|--------|
| SSR pattern | critical vuoto + Suspense + `ImpostazioniDeferredHydration` |
| Deferred prefetch | `settings.payload` via `getAppSettingsPayloadServer` |
| Hook | `useImpostazioniSettingsQuery` (tier static, hydration dedup) |
| In-uso queries | gated per `op-stati` / `op-addetti` + prefetch on nav |
| Bundle | lazy heavy sections + modali via `settings-section-loaders` |
| Budget | `/impostazioni` in `performance-budget-registry` |
| Policy tests | `impostazioni-perf-policy` |

## Verifica 2026-07-17

| Check | Esito |
|-------|-------|
| `npm run build` | PASS |
| `impostazioni-perf-policy.test.ts` | PASS |
| `waterfall-roi-audit.test.ts` | PASS |
| `performance-policy.test.ts` | PASS |

## Regenerate

```bash
npm run build
npx tsx lib/regression/impostazioni-perf-policy.test.ts
npx tsx lib/regression/waterfall-roi-audit.test.ts
npx tsx lib/regression/performance-policy.test.ts
```
