# Performance Governance v6 — Budget ufficiale

**Versione:** 6.0  
**SSOT codice:** [`lib/performance/performance-budget-registry.ts`](../lib/performance/performance-budget-registry.ts), [`lib/performance/performance-global-budgets.ts`](../lib/performance/performance-global-budgets.ts)  
**Data calibrazione:** 2026-07-17 (post build v5 + `route-bundle-stats.json`)

## Budget globali

| Metrica | Max | Misurazione | Motivazione |
|---------|-----|-------------|-------------|
| `GLOBAL_FIRST_LOAD_JS_KB` | 1900 KB | `scripts/ops/extract-build-budgets.mjs` → `route-bundle-stats` uncompressed | Shell condivisa + route chunk; baseline ~1793 KB |
| `GLOBAL_VENDOR_CHUNK_KB` | 800 KB | Largest single `.js` in `.next/static/chunks` | Evita monolite vendor |
| `MAX_PROVIDER_DEPTH` | 12 | `performance-policy.test.ts` static | Profondità provider app shell |
| `MAX_REALTIME_CHANNELS` | 8 | `gestionale-realtime-config.ts` | Subscription realtime |
| LCP | 3500 ms | Lighthouse cert | UX percepita |
| INP | 300 ms | Lighthouse cert | Interattività |
| CLS | 0.15 | Lighthouse cert | Stabilità layout |
| TTFB | 1200 ms | Playwright perf / Lighthouse | Rete + server |

## Budget per route (cold load)

| Route | maxPayloadKb | maxQueries | maxServerMs | maxHydrationMs | maxFirstLoadJsKb |
|-------|--------------|------------|-------------|----------------|------------------|
| `/lavorazioni` | 12 | 2 | 2 | 3000 | 1900 |
| `/report` | 48 | 6 | 5 | 3500 | 1900 |
| `/mezzi` | 32 | 1 | 2 | 2500 | 1900 |
| `/magazzino` | 15 | 2 | 2 | 3000 | 1900 |
| `/dashboard` | 25 | 4 | 5 | 3500 | 1900 |
| `/documenti` | 12 | 3 | 3 | 3000 | 1900 |
| `/impostazioni` | 12 | 1 | 3 | 2500 | 1900 |
| `/sicurezza` | 15 | 2 | 4 | 2500 | 1900 |
| `/login` | 8 | 0 | 1 | 2000 | 1700 |
| `/privacy-policy` | 6 | 0 | 1 | 2500 | 1700 |
| `/offline` | 4 | 0 | 1 | 1500 | 1700 |

### Note calibrazione payload

- `/report` e `/mezzi`: ceiling alzato rispetto a v5 dopo snapshot REST reale (42 KB / 28 KB) con ~15% headroom.
- `maxFirstLoadJsKb`: valori da Next 16 `diagnostics/route-bundle-stats.json` (JS non compresso).

## Regressioni vs baseline

| Metrica | WARNING | FAIL |
|---------|---------|------|
| payloadKb, queryCount, serverMs, bundleKb | +10% | +20% |

Hard ceiling: superamento di `max*` in registry = FAIL anche senza baseline.

## Eccezioni

Richiedono:

1. Label PR `perf-budget-exception`
2. Motivazione tecnica nel body PR
3. Entry in [`lib/performance/performance-budget-exceptions.ts`](../lib/performance/performance-budget-exceptions.ts) con `expiresOn`

## Riferimenti

- [ADR-004](./adr/ADR-004-performance-governance.md)
- [performance-regression-guard.md](./performance-regression-guard.md)
- [performance-governance-v6-rules.md](./performance-governance-v6-rules.md)
