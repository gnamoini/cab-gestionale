# Request Decision Registry (RDR)

Pure functional SSOT for cross-layer decisions (edge, server, client). **No I/O, no MIC, no DB, no fetch.**

## Boundaries

| Layer | Role |
|-------|------|
| **RDR** | Pure policy: cache, routing class, asset delivery, auth precheck strategy |
| **Edge handlers** | Early reject + header hints; call RDR then execute I/O on fallback |
| **Node API routes** | Recompute RDR (never trust edge headers as SSOT); RBAC + storage |
| **MIC** | Unchanged — not invoked by RDR |

## DecisionPolicy contract

```ts
{
  cacheable: boolean;
  ttl: number;           // seconds
  edgeEligible: boolean;
  requiresAuth: boolean;
  fallbackRoute: string | null;
}
```

## Pure functions

| Function | Output |
|----------|--------|
| `getCachePolicy(ctx)` | tier, cacheControl, DecisionPolicy |
| `getRouteClassification(ctx)` | document_delivery, media_image, upload_policy, non_edge, ... |
| `getAssetDeliveryStrategy(ctx)` | thumbnail, full_file, download, transcoded_image, none |
| `shouldBypassCache(ctx)` | true for upload/write/download |
| `getAuthPrecheckStrategy(ctx)` | defer_to_auth, not_applicable |

## RequestContext

Built via pure builders in [`lib/decision/request-context.ts`](lib/decision/request-context.ts):

- `buildRequestContextFromEdge(NextRequest)`
- `buildRequestContextFromServer(Request)`
- `buildRequestContextFromClientPath(pathname, query)`

Fields: `route`, `method`, `entityType`, `entityId`, `operationType`, `runtimeSource`, `query`, `headers`, `flags`.

## Edge + server alignment

1. Edge handler: RDR → set `x-edge-delivery-route` / `x-edge-cache-policy` on fallback
2. Server route: RDR recompute → `recordDecisionAlignment` compares hint vs server value (dev only)
3. Mismatch → [`request-decision-audit.ts`](lib/observability/request-decision-audit.ts)

## Dev tools

```
NEXT_PUBLIC_REQUEST_DECISION_AUDIT=0   # opt out
window.__REQUEST_DECISION_AUDIT__.report()
```

## Client / SSR

- `resolveClientDocumentDeliveryStrategy` in document-delivery-url
- `resolveClientMediaCacheHint` in media-delivery-url
- `getPrefetchCachePolicyHint(scopeKey)` — read-only SSR hint (does not change RQ keys)

## Non-goals

- Central orchestrator
- MIC invalidation
- React Query key changes
- DB-backed RBAC in RDR

## Related

- [edge-functions-architecture.md](./edge-functions-architecture.md)
- [query-deduplication-strategy.md](./query-deduplication-strategy.md)
