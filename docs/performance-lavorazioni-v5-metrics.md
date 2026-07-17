# Performance Lavorazioni v5 — Metrics

**Date:** 2026-07-17

## After (v5)

| Metrica | Stato |
|---------|-------|
| Confirm concludi/elimina | `dynamic()` + modal gate |
| Query archivio | Gated (v3) |
| virtualRows lista | Attive + archivio (v3) |

## Verifica

`npx tsx lib/regression/lavorazioni-perf-policy.test.ts`
