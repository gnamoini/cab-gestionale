# Query Deduplication Strategy

This layer **complements** React Query — it does not replace it.

## React Query native dedup

When multiple components call `useQuery` with the **same `queryKey`**, React Query shares one in-flight fetch and one cache entry. That covers same-key concurrent subscriptions.

## When this layer applies

Remaining duplication in the gestionale comes from:

| Cause | Mitigation |
|-------|------------|
| Imperative fetch bypassing RQ | `dedupQuery` on `fetchCabAppSettingsPayload` and `useServiceQuery` |
| Same entity, different mount timing | In-flight promise map in `lib/query/query-dedup-registry.ts` |
| Post-hydration refetch on SERVER_OWNER data | `useSharedEntityQuery` + settings static tier `refetchOnMount: false` |
| Extra fetch vs hydrated list | `useLavorazioneCosto` reads `queryClient.getQueryData` first |

Auth user reads are **out of scope** — `AuthContext` is the SSOT.

## Core APIs

### `dedupQuery(queryKey, fetchFn, meta?)`

Wraps a fetch with ephemeral in-flight sharing. Cleared on settle; long-term cache stays in React Query only.

Used inside:

- `useServiceQuery` (all service reads)
- `fetchCabAppSettingsPayload` (imperative + `fetchQuery` paths)

### `useSharedEntityQuery`

Generic wrapper over `useServiceQuery` for cross-component entity reads:

- `entityType`, `entityId`, `scope`, `dedupTag`
- `ownershipScopeKey` → hydration-aware `refetchOnMount: false` when dehydrated data exists
- Dev: `registerDedupConsumerTag`, `assertQueryKeyAligned`

Adopted by `useLavorazioneBase`, `useMezzoBase`.

### MIC invalidation

`executeInvalidateGestionaleTables` clears in-flight dedup entries (dev-guarded) via `clearDedupForEntity`. React Query invalidation is unchanged.

## Cross-component policy

| Entity | Pattern |
|--------|---------|
| Settings payload | `AppSettingsQueryProvider` + shared context; dedup on imperative fetch |
| Lavorazione / Mezzo detail | `useSharedEntityQuery` |
| Magazzino list | Factory key + cache-first in cost hook |
| Auth user | `AuthContext` only |

## SSR / hydration

Align keys via `lib/render/query-key-factory.ts` and ownership via `lib/render/query-ownership-registry.ts`. See [render-path-simplification.md](./render-path-simplification.md).

`useSharedEntityQuery` calls `shouldSkipClientInitialFetch` for `SERVER_OWNER` / `HYBRID_OWNER` scopes.

## Dev tools

Enable (default in development):

```
NEXT_PUBLIC_QUERY_DEDUP_AUDIT=1   # force on
NEXT_PUBLIC_QUERY_DEDUP_AUDIT=0   # opt out
```

Console:

```
[Dedup] HIT settings:payload reused (header + sidebar)
[Dedup] MISS lavorazioni:detail (detail modal)
```

Window globals:

- `window.__GESTIONALE_QUERY_DEDUP__` — `{ report, hits, events, inFlight, networkFetches, dedupSkips, reset }`
- `window.__cabQueryFetchAudit()` — network fetch counts (queryFn executed, not dedup hits)

## Production

`isQueryDedupAuditEnabled()` returns `false` in production. In-flight map still works with minimal overhead; audit modules are no-ops when disabled.
