# Minimal Invalidation Contract (MIC)

Lightweight, static coordination for derived cache invalidation across React Query, HTTP asset caches (PDF, document preview), and report refresh — without a runtime dependency graph.

## Relationship to other layers

| Layer | Role |
|-------|------|
| [Runtime truth layer](runtime-truth-layer.md) | RBAC/settings + operational domain invalidation (internal to MIC) |
| [Document intelligence](document-intelligence-map.md) | Content-hash thumbnails; MIC bumps `?v=` for same-id overwrites |
| [PDF artifacts](pdf-generation-map.md) | Content-hash storage; MIC wipes scopes as safety net |

## Entity registry (SSOT)

Defined in [`lib/cache/mic-registry.ts`](../lib/cache/mic-registry.ts):

| Entity | React Query domain | Extra keys | PDF scopes (server) | Report refresh | Version bump |
|--------|-------------------|------------|---------------------|----------------|--------------|
| `lavorazione` | `lavorazioni` | base, pdfs, schede | `lavorazioni-in-corso/global`; scheda-* / `{id}` | yes | yes |
| `documento` | `documenti` | — | — | no | yes |
| `mezzo` | `mezzi` | base | `report-bundle/global` | yes | yes |
| `report` | `report` | universe | `report-bundle/global` | yes | no |
| `settings` | runtime truth | settings QK | global PDF scopes | yes | no |

## API

```ts
import { invalidateEntity, resolveEntityCacheVersion } from "@/lib/cache/minimal-invalidation-contract";

await invalidateEntity({
  queryClient,
  entityType: "lavorazione",
  entityId: lavorazioneId,
  scope: "full", // default
  dbVersion: row.updated_at,
});
```

### Scopes

| Scope | Effect |
|-------|--------|
| `full` | Version bump + RQ + report refresh + server PDF wipe |
| `reactQuery` | RQ invalidation only |
| `assets` | Version bump + server PDF wipe |
| `report` | Report broadcast refresh |

### Version resolution

[`resolveEntityCacheVersion`](lib/cache/entity-version-registry.ts):

1. `dbVersion` from row (`updated_at`, `meta.uploadedAt`) when provided
2. Else client bump from MIC invalidation (same session)
3. Else omit `?v=` from URL

No `entity_version` SQL table in v1.

## Server asset invalidation

`POST /api/cache/invalidate-entity` — entity-scoped RBAC, calls [`runMicServerInvalidations`](lib/cache/mic-server-invalidate.server.ts).

Invoked fire-and-forget from client MIC when PDF scopes are configured.

## Integration points

- [`invalidate-related.ts`](../src/lib/react-query/invalidate-related.ts) — delegates mezzo/lavorazione mutations to MIC when `entityId` is known
- [`use-lavorazione-mutations.ts`](../src/hooks/gestionale/use-lavorazione-mutations.ts)
- [`use-mezzo-mutations.ts`](../src/hooks/gestionale/use-mezzo-mutations.ts)
- [`documenti-view.tsx`](../components/gestionale/documenti/documenti-view.tsx)
- [`lavorazione-documents-manager.tsx`](../components/gestionale/media/lavorazione-documents-manager.tsx)
- [`persist-settings-record.ts`](../lib/sync/persist-settings-record.ts) — `invalidateMicSettings`

## Observability (dev)

- `logMicInvalidation` — debug log in development
- `getMicInvalidationCounters()` — in-memory per-entity counts

## Non-goals

- Distributed event bus / queues
- Runtime dependency graph
- CDN tag purge for `/api/media/image`
- SQL version table (v1)
