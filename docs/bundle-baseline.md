# Bundle baseline

Recorded before bundle-size reduction patches (Wave B1–B3).

| Field | Value |
|-------|-------|
| Date | 2026-06-11 |
| Commit | `f39d48e` |
| Next.js | 16.2.6 |
| Build | `npm run build` (production) |

## Notes

Next.js 16 production build output lists routes without per-route **First Load JS** table (unlike Next 13–14). Use `npm run analyze` (`ANALYZE=true` + `@next/bundle-analyzer`) for chunk-level inspection via generated HTML reports in `.next/analyze/`.

## Target routes (pre-optimization)

| Route | Page module | Known heavy client deps |
|-------|-------------|-------------------------|
| `/dashboard` | `dashboard-view.tsx` | operational cards, promemoria, feeds |
| `/lavorazioni` | `lavorazioni-view.tsx` (~2400 LOC) | schede modal (lazy), kanban (lazy), create modal (eager) |
| `/report` | `report-analytics-view.tsx` | all report zones eager |
| `/magazzino` | `magazzino-view.tsx` (~2000 LOC) | modals lazy, react-virtual |
| `/documenti` | `documenti-view.tsx` | modals lazy |

## Shared layout (pre-optimization)

- `app-shell.tsx` statically imported dev audit mounts (`ui-os-engine`, layout linters) — bundled in production despite runtime `NODE_ENV` guards.
- `UIPageAdapter` from `lib/ui-os` on lavorazioni/magazzino/report pages.

## Post-optimization verification

After patches, re-run:

```bash
npm run build
npm run analyze
npx tsx lib/regression/performance-policy.test.ts
```

Compare analyzer treemaps for: shared `app-shell` chunk, per-route async `*View` chunks, absence of `ui-os` in default prod builds.

## Post-optimization (Wave B1–B3)

| Change | Files |
|--------|-------|
| Page-level `*ViewLazy` | `lazy-route-views.tsx`, 5 `page.tsx` |
| Dev mounts split | `dev-audit-mounts.tsx`, `app-shell.tsx` |
| `LavorazioneCreateModal` dynamic | `lavorazioni-view.tsx` |
| Report/dashboard zones | `report-view.tsx`, `report-analytics-view.tsx`, `dashboard-view.tsx` |
| UI OS gate | `ui-page-adapter-gate.tsx` |
