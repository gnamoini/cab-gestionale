# Performance audit v1 — measurement baseline

**Date:** 2026-07-16  
**Branch:** post-optimization implementation (audit v1 roadmap)  
**Prior baseline:** [dashboard-boot-baseline.md](./dashboard-boot-baseline.md) (2026-06-30, ~6.6 MB JS raw)

## How to regenerate

```bash
npm run build
npm run analyze
npx tsx lib/regression/performance-policy.test.ts
npx tsx lib/lavorazioni/lavorazioni-schede-prefetch.test.ts
```

Boot investigation (dev): enable runtime boot metrics; inspect `authRestoreDuration`, `dashboardLoadDuration`.

## Build verification

| Check | Command |
|-------|---------|
| Production build | `npm run build` |
| Performance policy | `npx tsx lib/regression/performance-policy.test.ts` |
| Schede prefetch unit | `npx tsx lib/lavorazioni/lavorazioni-schede-prefetch.test.ts` |

## Optimizations applied (v1 implementation)

### Phase 0 — Measurement
- Build + policy tests as SSOT gates
- Bundle analyzer via `ANALYZE=true npm run analyze`

### Phase 1 — Quick wins
- Mezzi search debounce 300ms (`searchApplied`)
- `loading.tsx` for dashboard, lavorazioni, magazzino
- AppSettingsQuery context stable memo slice
- MobileNavShellProvider `useMemo` value
- Lavorazioni BFF prefetch + settings parallel (`fetchLavorazioniPageDTOServer`)
- Schede SSR/client limited to first page (`pickLavorazioniInitialSchedeIds`)
- `optimizePackageImports` for TanStack, dnd-kit, floating-ui
- Filter catalog O(n) via Set (`pushUnique`)
- Magazzino suggestions single-pass scan
- List search blur timer cleanup on unmount
- GPU: `motion-safe:backdrop-blur` modals; toolbar blur gated by `prefers-reduced-motion`

### Phase 2 — Lists / DOM
- Server list pagination auto on `VERCEL_ENV=preview`
- `virtualRows`: Mezzi, Preventivi, Fatturazione fatture
- Timesheet employee row virtualizer (>15 employees)

### Phase 3 — React architecture
- Lazy `MezziNewModal`, `MezziHubDetailModal`
- GlobalLoadingQueryBridge rAF-coalesced recompute
- Lavorazioni page-scoped schede fetch + attive sort full-schede guard

### Phase 4 — Next.js / network
- BFF `lib/bff/lavorazioni-page-fetch-server.ts`
- Server prefetch settings for agenda, dipendenti, sicurezza

## Target routes — post-optimization expectations

| Route | Expected improvement |
|-------|---------------------|
| `/lavorazioni` | Lower TTFB (settings∥BFF); smaller schede dehydrate |
| `/mezzi` | Fewer DB round-trips during search typing |
| `/magazzino` | `loading.tsx` perceived latency |
| `/preventivi`, `/fatturazione` | Constant DOM via virtualRows |
| `/dipendenti` | Timesheet scroll with many employees |
| `/agenda`, `/sicurezza`, `/dipendenti` | Settings hydrated server-side |

## Performance budget (tracking)

See [performance-audit-v2.md](./performance-audit-v2.md) for revised scorecard.

| Metric | Pre (2026-06-30) | Target post-v1 |
|--------|------------------|----------------|
| JS raw `.next/static` | ~6.6 MB | ≤ 6.0 MB (optimizePackageImports) |
| Schede prefetch (lavorazioni SSR) | All attive IDs | ≤ 100 IDs |
| Mezzi search queries per phrase | N keystrokes | 1 per 300ms |
| Virtualized desktop tables | 2 modules | 5 modules |
| Routes with `loading.tsx` | 0 | 3+ |

## Residual (not in v1)

- Monolithic view split (lavorazioni/magazzino 2000+ LOC)
- Auth context decomposition
- Kanban virtualization
- AppShell code-split
- Edge auth cache
- globals.css route split
