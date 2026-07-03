# List query transforms (PR-3)

Taxonomy for list data after `ListQueryResult.data` is materialized.

| Type | Layer | Rule |
|------|-------|------|
| **Business filter** | RPC / `queryKey` | mode, stato, cliente, archived — never client `.filter()` on business dimensions |
| **Structural (U4-A)** | data layer on `List<T>` | groupBy, sort, map — bucket invariant: every row in exactly one bucket |
| **Presentation (U5)** | render-adjacent | search highlight, fuzzy ranking, virtual window slice, client pagination |

## Allowed (U5)

```typescript
rows.map((r) => ({ ...r, _highlight: matchScore(r, q) }));
visibleWindow = rows.slice(start, end); // List ref unchanged
```

## Forbidden (U4-B)

```typescript
rows.filter((r) => r.stato === "aperta"); // → RPC p_stato
groupBy(rows.filter((r) => r.clienteId === x), (r) => r.stato);
```

## Server pagination UI

- Use `controls.fetchNextPage()` and top-level `hasNextPage` (R-13c: not `meta.hasNextPage`).
- `meta.pagesCount` is observability-only.
