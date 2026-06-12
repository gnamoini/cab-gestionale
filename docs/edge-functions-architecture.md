# Edge Functions Architecture

Minimal edge decision layer inside the Next.js proxy pipeline (`proxy.ts` → `proxy-handler.ts`). Complements — does not replace — Node API routes, MIC, or SSR.

## Boundary

| EDGE_SAFE | NON_EDGE |
|-----------|----------|
| JWT exp precheck (unverified decode) | MIC invalidation |
| Request/query normalization | DB mutations |
| Early 400/401/413 rejection | PDF generation |
| Document delivery path classification | Report generation |
| Media cache-policy decision | Aggregations / joins |
| Upload policy schema validation | DB-backed RBAC |

Explicit NON_EDGE prefixes: `/api/pdf/`, `/api/cache/`, `/api/preventivi/`, `/api/branding/`.

## Flow

1. Static assets → pass through
2. `/api/*` + auth group → `auth-precheck-edge` (before Supabase `getUser`)
3. Existing proxy auth + page RBAC (unchanged)
4. `/api/*` + edge layer → `edge-router` → handler or fallback
5. Node route executes RBAC, storage, `sharp`, etc.

## Handlers

| Handler | Route | Edge work | Fallback |
|---------|-------|-----------|----------|
| `auth-precheck-edge` | `/api/*` | Reject expired JWT | Full auth flow |
| `document-route-edge` | `GET /api/documents/:id(/preview)` | Param validation, delivery classify | `deliverDocument*` |
| `media-cache-edge` | `GET /api/media/image` | Path normalize, cache tier | `sharp` transcode |
| `upload-policy-precheck-edge` | `POST /api/documents/upload-policy` | JSON/schema validation | RBAC + path generation |

## Fallback model

- Unresolved → `NextResponse.next()` with injected headers (`X-Correlation-Id`, `x-edge-delivery-route`, `x-edge-cache-policy`)
- No duplicate business logic: shared validators in `lib/edge/validators/` used by edge and Node routes
- Dev trace headers: `X-Edge-Decision`, `X-Edge-Handler`, `X-Edge-Fallback-Reason`

## Feature flags

| Flag | Default (dev) | Effect |
|------|---------------|--------|
| `NEXT_PUBLIC_EDGE_LAYER=0` | on | Master off |
| `NEXT_PUBLIC_EDGE_AUTH=0` | on | Auth precheck off |
| `NEXT_PUBLIC_EDGE_DOCUMENTS=0` | on | Document edge off |
| `NEXT_PUBLIC_EDGE_MEDIA=0` | on | Media edge off |
| `NEXT_PUBLIC_EDGE_UPLOAD=0` | on | Upload precheck off |
| `NEXT_PUBLIC_EDGE_RUNTIME_TRACE=0` | on | Tracing off |

Production: all edge flags hard-off (`isEdgeLayerEnabled()` → false).

## Dev tools

```js
window.__EDGE_RUNTIME_STATS__.report()
window.__EDGE_RUNTIME_STATS__.stats()
window.__EDGE_RUNTIME_STATS__.reset()
```

Client fetch hook records `X-Edge-*` response headers in development.

## Related

- [render-path-simplification.md](./render-path-simplification.md) — SSR/query hydration (separate concern)
- [runtime-coordination-observability.md](./runtime-coordination-observability.md) — `X-Correlation-Id` alignment

## Non-goals

- Cloudflare/Vercel-specific edge platforms beyond Next.js middleware
- `runtime = 'edge'` on document/media routes (Node + `sharp` stays)
- DB access or MIC from edge layer
