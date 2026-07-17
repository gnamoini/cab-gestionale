# Performance Report v3 — Implementations

**Date:** 2026-07-16

## Wave A — SSR streamabile

| File | Change | Benefit |
|------|--------|---------|
| `components/gestionale/report/report-deferred-hydration.tsx` | New RSC boundary calling `prefetchDeferredPage("report")` | BFF 6-wave runs inside Suspense; shell streams earlier |
| `app/(gestionale)/report/page.tsx` | `prefetchCriticalPage` + nested `ReportDeferredHydration` | TTFB no longer blocked on full BFF |

## Wave B — Query ownership

| File | Change | Benefit |
|------|--------|---------|
| `src/hooks/gestionale/use-entity-list-queries.ts` | `mezzi.report` / `magazzino.report` ownership + `movimenti.list` via `useSharedEntityQuery` | Skip hydration refetch on report universe |
| `src/hooks/gestionale/use-report-queries.ts` | `useReportLavorazioniQuery` + `useReportManualEntriesQuery` with ownership | Lav + manual entries dedup |
| `lib/report/use-report-live-data.ts` | Uses new query wrappers | Central live-data path aligned with registry |
| `src/hooks/view/use-report-manual-entries.ts` | Re-exports query from gestionale hook | Backward-compatible mutations |

## Wave C — Bundle gates

| File | Change | Benefit |
|------|--------|---------|
| `components/report/report-lavorazioni-import-result-modal.tsx` | Extracted modal | Lazy chunk on import result |
| `components/report/report-magazzino-manual-history-modal.tsx` | Extracted modal | Lazy chunk on history editor |
| `report-lavorazioni-section.tsx` / `report-magazzino-section.tsx` | `dynamic()` modal imports | Smaller section chunk until modal opens |

## Wave D — CPU derived

| File | Change | Benefit |
|------|--------|---------|
| `lib/report/use-report-live-data-derived.ts` | `lavListRows` enrich + integrity memos | Narrower re-render surface |
| `lib/report/use-report-live-data.ts` | Thin coordinator | ~80 LOC moved to derived |

## Wave E — Economic query gating

| File | Change | Benefit |
|------|--------|---------|
| `components/report/use-report-derived-prefetch.ts` | Gate preventivi/invoices on `dati_economici` \| `grafici_kpi` open | −2 client queries on cold load (default: lavorazioni only) |
| `lib/report/prefetch-report-economic-queries.ts` | Prefetch helper | Warm cache on section expand |
| `components/report/layout/report-sections.tsx` | Prefetch on economic section open | Faster first paint of economic sections |

## Wave 0/F — Governance

| File | Change |
|------|--------|
| `docs/performance-report-v3-metrics.md` | Before/after SSOT |
| `lib/regression/report-perf-policy.test.ts` | Domain perf policy |
| `lib/regression/waterfall-roi-audit.test.ts` | Deferred hydration + derived enrich assert |
| `lib/regression/performance-policy.test.ts` | Report asserts → derived + report-queries |

## Unchanged (by design)

- `lib/bff/report-bundle-fetch-server.ts` — BFF already optimal
- Section `loadReportSection()` lazy imports
- `ReportPerformanceGate` runtime gating
- RBAC, schema, API contracts
