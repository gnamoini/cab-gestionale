# Render Path Simplification

Deterministic render pipeline for gestionale routes:

**Server → Prefetch → Dehydrate → Hydrate → Client read-only cache → Mutation → MIC → Revalidation**

## Ownership model

| Ownership | Meaning |
|-----------|---------|
| `SERVER_OWNER` | Always SSR-prefetched; client reads hydrated cache on cold load |
| `CLIENT_OWNER` | Client-only fetch (modals, lazy lists, localStorage-driven data) |
| `HYBRID_OWNER` | SSR seed when available + client refinement |

Registry: [`lib/render/query-ownership-registry.ts`](../lib/render/query-ownership-registry.ts)

## Query key factory

Single SSOT for list keys: [`lib/render/query-key-factory.ts`](../lib/render/query-key-factory.ts)

| Entity | Key shape |
|--------|-----------|
| Mezzi | `["mezzi", "list"\|"report", filters\|null]` |
| Magazzino | `["magazzino", "list"\|"report", filters\|null]` |
| Movimenti | `["movimenti", filters\|null]` |
| Lavorazioni | `["lavorazioniQueries", "list", stableFilterKey, "ops"\|"portal"]` |
| Settings | `["app_settings", "payload"]` |

Prefetch and client hooks **must** use the same factory + filter presets (`lavorazioni-prefetch-filters.ts`).

## Orchestrator

[`lib/render/render-path-orchestrator.ts`](../lib/render/render-path-orchestrator.ts):

- `resolveInitialLoad({ scopeKey })` — ownership, query key, lifecycle
- `assertQueryKeyAligned(serverKey, clientKey, context)` — dev warning on drift

Used by [`prefetch-gestionale-page.ts`](../src/lib/react-query/prefetch-gestionale-page.ts).

## Dev audit tools

| API | Purpose |
|-----|---------|
| `window.__GESTIONALE_RENDER_PATH__.report()` | Hydration mismatch summary |
| `window.__cabQueryFetchAudit()` | Client fetch counts per queryKey |

Enable: `NODE_ENV=development` or `NEXT_PUBLIC_HYDRATION_CONSISTENCY_AUDIT=1`

Opt-out cache audit: `NEXT_PUBLIC_CACHE_AUDIT=0`

## Tuning workflow

1. Cold-load a route (e.g. `/mezzi`, `/report`).
2. `__cabQueryFetchAudit()` — expect zero fetches for SERVER_OWNER scopes.
3. `__GESTIONALE_RENDER_PATH__.report()` — no key mismatches.
4. Mutate entity → MIC invalidates → refetch only affected scopes.

## Related docs

- [Server Components migration map](server-components-migration-map.md)
- [Minimal Invalidation Contract](minimal-invalidation-contract.md)

## Non-goals

- MIC / invalidation changes
- Full RSC migration of CLIENT_OWNER routes (documenti)
- Production runtime orchestration overhead
