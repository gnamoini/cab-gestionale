# Document delivery — performance impact

## Before

| Pattern | Cost |
|---------|------|
| Lavorazione PDF list | `listWithUrls()` — N signed-URL API calls on every hub open |
| Archive open | `storageCreateSignedUrl` per click (TTL 3600s, non-cacheable browser URL) |
| Metadata list | Already LIGHT columns — OK |

## After

| Pattern | Cost |
|---------|------|
| Lavorazione PDF list | Metadata only (`listByLavorazione`) — **0** storage URL generation |
| Open / download | Same-origin `GET /api/documents/:id` — **1** stream on user action |
| Repeat open | `Cache-Control: immutable` — browser reuse when `v` unchanged |
| Upload | `POST /api/documents/upload-policy` (small JSON) + direct client upload |

## Targets

- List views: **0** signed URL generation
- Repeat preview same document: **browser cache hit** (immutable)
- RBAC: single server gate for metadata fetch and binary stream

## Instrumentation

Response headers on proxy route:

- `X-Document-Source`: `archive` | `lavorazione`
- `Cache-Control`: `public, max-age=31536000, immutable`

## Remaining bottlenecks

- Large files (up to 100 MB) stream through Vercel function — monitor timeout
- No PDF/image thumbnails in v1 — full file on preview
- In-place lavorazione slot overwrite requires `?v=uploaded_at` cache buster
