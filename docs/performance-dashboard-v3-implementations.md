# Performance Dashboard v3 — Implementations

**Domain:** `/dashboard` only  
**Date:** 2026-07-16

## Interventions

| Wave | File(s) | Motivation | Benefit |
|------|---------|------------|---------|
| P0 | `lavorazioni-prefetch-filters.ts`, `dashboard-data-fetch-server.ts`, `prefetch-gestionale-page.ts`, `query-ownership-registry.ts` | SSR seeded `lavorazioni.list.attive` but client reads `report` key | −1 lav refetch at mount; hydration hit |
| 1.1 | `prefetch-gestionale-page.ts` (`prefetchCriticalPage` dashboard no-op) | Settings fetched twice (critical + BFF) | −1 settings RTT |
| 1.2 | `dashboard-data-fetch-server.ts` | Mezzo enrich then schede sequential | −50–150ms BFF wave 2 |
| 1.3 | `dashboard/page.tsx`, `dashboard-deferred-hydration.tsx` | Full blocking prefetch before HTML | Faster perceived TTFB via Suspense stream |
| 1.4 | `dashboard-data-fetch-server.ts` | Activity widget logs not prefetched | −3 queries when activity visible |
| 2.1 | `dashboard-widget-renderer.tsx` | All widgets static in control tower chunk | Smaller initial JS; lazy per widget |
| 2.2 | `dashboard-health-score-widget.tsx` | Health API always on mount | API only when widget in viewport |
| 3.1 | `dashboard-control-tower-layout.tsx` | `bySection` rebuilt every render | Fewer layout commits |
| 3.2 | `dashboard-recent-activity-widget.tsx` | Row shells re-created | Stable activity list renders |
| 3.3 | `use-dashboard-sync-invalidation.ts`, `control-tower-metrics-provider.tsx` | Duplicate `log_modifiche` listeners | One debounced invalidation path |
| 3.4 | `use-control-tower-metrics.ts` | `lavRows` used raw query data | Correct filtered rows in selectors |
| 4 | `dashboard-diary-panel.tsx`, removed `dashboard-widget-grid.tsx` | Dead code; GPU shadow on diary | Less bundle; reduced-motion friendly |

## Residual (needs Core / other domains)

- Calendar v2 analytics (`CLIENT_OWNER`) — not SSR-prefetched by design
- Header KPI queries (preventivi, fatture, timesheet) — still client on first paint
- Full `use-control-tower-metrics.ts` split — optional; file still large
- Virtualization — lists bounded; no ROI

## Validation

```bash
npm run build
npx tsx lib/regression/dashboard-perf-policy.test.ts
npx tsx lib/regression/performance-policy.test.ts
npx tsx lib/regression/dashboard-inputs-audit.test.ts
```
