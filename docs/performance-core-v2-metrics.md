# Performance Core v2 — Metrics SSOT

**Date:** 2026-07-16  
**Baseline:** post v1 implementation

## Before (v2 start)

| Metrica | Valore |
|---------|--------|
| `.next/static` raw | 9,635,564 bytes (~9.2 MB) |
| `app/globals.css` | 39,833 bytes |
| `gestionale-list-table.css` | 24,160 bytes |
| `loading.tsx` routes | 3 / ~15 gestionale |
| Audit score | 67/100 |

## After (v2 complete — 2026-07-16)

| Metrica | Valore |
|---------|--------|
| `.next/static` raw | 10,095,421 bytes (~9.6 MB) |
| `globals-core.css` | 21,523 bytes |
| `globals-gestionale-shell.css` | 18,381 bytes |
| `gestionale-list-table.css` | 24,160 bytes (scoped to gestionale layout) |
| `loading.tsx` routes | 15 gestionale |
| Policy tests | PASS |
| Audit score | 79/100 |

## Regenerate

```bash
npm run build
npx tsx lib/regression/performance-policy.test.ts
powershell -Command "(Get-ChildItem -Recurse .next/static -File | Measure-Object -Property Length -Sum).Sum"
```
