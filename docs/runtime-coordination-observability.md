# Runtime Coordination Observability

Dev-only tracing layer that answers: **“This mutation updated what, when, and why across all layers.”**

Traces the path **mutation → MIC → React Query → server asset invalidation/delivery** with correlation IDs, an in-memory ring buffer, and collapsed console timelines. **Zero production overhead** — all APIs are no-ops when tracing is disabled.

## Enable

Tracing is active when **either** condition holds (and `NODE_ENV !== "production"`):

| Flag | Value |
|------|-------|
| `NODE_ENV` | `development` |
| `NEXT_PUBLIC_RUNTIME_COORDINATION_TRACE` | `1` |

Helper: `isRuntimeCoordinationTraceEnabled()` in `lib/observability/config.ts`.

## Event catalog

| Type | Layer | When |
|------|-------|------|
| `mutation_started` | mutation | `traceMutationLifecycle` entry |
| `mic_invalidation_triggered` | mic | `invalidateEntity` begins / server PDF wipe scheduled |
| `react_query_invalidated` | react-query | After operational truth + extra query keys |
| `server_cache_hit` | document-preview / pdf | Asset served from cache |
| `server_cache_miss` | document-preview / pdf | Cache miss before regeneration |
| `asset_regenerated` | mic / document-preview / pdf | PDF scope wipe or thumbnail/PDF generation |
| `ui_render_completed` | ui | Double `requestAnimationFrame` after MIC |

### Example timeline (console)

```
[RC] lavorazione:abc123… (rc_1718123456789_x7k2m) — 5 events
  mutation_started layer=mutation {"operation":"update"}
  mic_invalidation_triggered (+2ms) scope=full layer=mic
  react_query_invalidated (+8ms) layer=react-query
  mic_invalidation_triggered (+1ms) layer=mic {"serverInvalidation":true}
  ui_render_completed (+32ms) layer=ui
```

## Correlation ID propagation

| Hop | Mechanism |
|-----|-----------|
| Mutation | `traceMutationLifecycle` → `createCorrelationId()` |
| MIC | `invalidateEntity` reads `correlationId` or active context |
| MIC → server | `X-Correlation-Id` header on `POST /api/cache/invalidate-entity` |
| Server routes | `readCorrelationIdFromRequest(request)` (best-effort on preview/PDF fetches) |

## Dev console API

Mounted on `window` in development via `RuntimeCoordinationDebugMount`:

```js
__GESTIONALE_RC__.getTrace({ entityId: "…" })
__GESTIONALE_RC__.getTrace({ correlationId: "rc_…" })
__GESTIONALE_RC__.summary()
__GESTIONALE_RC__.clear()
```

Ring buffer: max **200** events (client). Server logs via `gestionaleLogger.debug("runtime.coordination", …)` — no persistent buffer in production.

## Instrumented mutation entrypoints

- `use-lavorazione-mutations.ts` — create / update / remove / restore / conclude
- `use-mezzo-mutations.ts` — create / update
- `documenti-view.tsx` — `refreshDocumenti` (upload / delete)
- `lavorazione-documents-manager.tsx` — `syncDocuments`
- `persist-settings-record.ts` — settings writes

## Relationship to MIC and logging

- **[Minimal Invalidation Contract](minimal-invalidation-contract.md)** — `invalidateEntity` emits MIC + RQ trace events; optional `correlationId` on `MicInvalidateInput`.
- **`gestionaleLogger`** — unstructured debug logs; RC tracer is timeline-specific. When RC is enabled, `logMicInvalidation` defers to the tracer to avoid duplicate console noise.

## Non-goals

- External APM (Datadog, Sentry breadcrumbs)
- Persistent storage / IndexedDB
- Event bus or queue
- Production sampling
- Global `useServiceMutation` instrumentation
- UI dev panel (optional follow-up)
