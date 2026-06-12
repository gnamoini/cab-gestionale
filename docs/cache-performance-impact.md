# Cache Performance Impact

Misurazioni attese dopo multi-layer caching (post DTO refactor). SSOT policy: [`cache-strategy-map.md`](cache-strategy-map.md).

## Duplicate fetches eliminated

| Area | Before | After |
|------|--------|-------|
| Settings payload | 4+ independent `useCabAppSettingsPayloadQuery` owners + `staleTime: 0` on global options | Single `AppSettingsQueryProvider` + STATIC Infinity stale |
| Dashboard lavorazioni | `useDashboardMetrics` (archived false) + `DashboardRecentFeeds` (all archived) | Allineati stesso filter key → 1 network fetch |
| Dashboard global options | `useDashboardMetrics` + `DashboardOperationalCards` + feeds | Operational cards usa `globalOpts` da metrics |
| Preventivi mezzi | `usePreventiviRecordsQuery` + `useMezziListQuery` standalone | Solo records hook espone `mezziRows` |
| Report KPI lavorazioni | `useReportLiveData` + `useReportKpiPerformanceData` duplicate lav query | KPI usa `live.attive/completate/storico` merge |
| Security users tab | Parent + panel entrambi `useSecurityUsersPermissionsQuery` | Panel riceve `sharedUsersQ` |

## Client cache policy changes

| Dataset | staleTime (before) | staleTime (after) |
|---------|-------------------|-------------------|
| `app_settings` via `useGlobalOptions` | 0 (always stale) | Infinity (STATIC) |
| `mezzi` list | 30s CORE | 15 min SEMI |
| `magazzino` list | 30s CORE | 15 min SEMI |
| Profile names batch | 120s | 120s (SSOT constant) |
| Lavorazioni attive | 30s | 30s (unchanged — DYNAMIC) |

## Server / edge

| Path | Change |
|------|--------|
| `fetchOperatorGlobalSettingsDbEnabledServer` | React `cache()` per request |
| `/api/branding` | `s-maxage=3600, stale-while-revalidate=86400` |
| sessionStorage settings | Fingerprint `max(updated_at)` per hydration |

## Validation

### Dev query counter

In development (`NEXT_PUBLIC_CACHE_AUDIT` ≠ `0`):

```js
window.__cabQueryFetchAudit()
```

Export JSON and summarize:

```bash
node scripts/ops/cache-hit-audit.mjs test-results/cache-fetch-counts.json
```

### REST benchmark (payload unchanged by RQ cache)

```bash
node scripts/ops/rest-benchmark-roles.mjs > test-results/rest-benchmark-roles.json
```

## Target metrics (client session)

| Metric | Target |
|--------|--------|
| Settings network fetches per dashboard visit | 1 (0 se fingerprint sessionStorage valido) |
| Dashboard lavorazioni list fetches cold | 1 attive (chiuse lazy) |
| Cache hit ratio settings (RQ) | >95% dopo primo fetch |

## Residual bottlenecks

- Lavorazioni attive: 30s stale + realtime invalidation — **non cacheabili** a Infinity
- Report aggregation CPU client-side
- Full-table lists senza paginazione server
- RLS authenticated PostgREST RTT

Consistency > performance.
