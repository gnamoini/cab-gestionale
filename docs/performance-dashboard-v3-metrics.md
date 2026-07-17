# Performance Dashboard v3 — Metrics SSOT

**Date:** 2026-07-16  
**Domain:** `/dashboard` only

## Before (v3 start)

| Metrica | Valore |
|---------|--------|
| SSR lav query key | `lavorazioni.list.attive` (light) |
| Client lav query key | `lavorazioni.list.report` |
| Hydration mismatch refetch | 1× lavorazioni al mount |
| Settings fetch per nav | 2× (critical + BFF) |
| BFF wave 2 | sequenziale (mezzo → schede) |
| Widget chunk | eager static imports |
| Activity log prefetch | 3 / 7 entità |

## After (v3 complete — 2026-07-16)

| Metrica | Valore |
|---------|--------|
| SSR/client lav key | allineati (`lavorazioni.list.report`) |
| Settings fetch | 1× (BFF deferred only) |
| Streaming | `DashboardDeferredHydration` + Suspense |
| Activity log prefetch | fino a 6 entità (RBAC-aware) |
| Widget lazy | per-widget `dynamic()` |
| Policy tests | PASS (`dashboard-perf-policy`, `performance-policy`) |
| Build | PASS |

## Regenerate

```bash
npm run build
npx tsx lib/regression/dashboard-perf-policy.test.ts
NEXT_PUBLIC_BOOT_TIMING=1 npm run dev
```
