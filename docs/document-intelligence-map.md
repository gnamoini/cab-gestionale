# Document intelligence map

Content-aware enrichment on top of the [document delivery layer](document-delivery-map.md): thumbnails, hash deduplication, semantic classification, lazy list previews.

## Storage

| Bucket | Path pattern | Purpose |
|--------|--------------|---------|
| `documenti` | `blobs/{aa}/{sha256}` | Content-addressed archive blobs (dedup) |
| `documenti` | `{uuid}/{file}` | Legacy archive paths (unchanged) |
| `documenti` | `lavorazioni/{id}/ddt.pdf` | Lavorazione slots (no dedup) |
| `documenti-thumbnails` | `{sha256}.webp` | Shared thumbnails keyed by content hash |

SSOT: [`lib/documents/document-thumbnail-paths.ts`](../lib/documents/document-thumbnail-paths.ts), [`src/lib/storage/storage-paths.ts`](../src/lib/storage/storage-paths.ts)

## Metadata (`documenti.meta` JSON)

| Field | Description |
|-------|-------------|
| `contentHash` | SHA-256 hex of file bytes |
| `thumbnailKey` | Object path in `documenti-thumbnails` |
| `semanticClass` | Heuristic class (`ddt`, `fattura`, …) |

## APIs

| Route | Role |
|-------|------|
| `GET /api/documents/:id/preview` | WebP thumbnail stream (RBAC via `resolveDocumentFileServer`) |
| `POST /api/documents/upload-policy` | Accepts `contentHash`; returns `deduplicated`, `semanticClass` |

## Flows

### Upload (archive, dedup)

```
Client sha256HexFromFile(file)
  → POST upload-policy { contentHash }
  → HIT: { path: blobs/…, deduplicated: true } — skip storageUpload
  → MISS: client storageUpload once
  → documentiService.create(meta.contentHash, meta.semanticClass)
  → optional warm: GET /preview (fire-and-forget)
```

### List preview (lazy)

```
DocumentiView row → DocumentThumbnail (IntersectionObserver)
  → GET /api/documents/:id/preview?source=archive
  → HIT: stream cached WebP | MISS: generate via sharp → upload → stream
```

### Delete (refcount)

```
deleteDocumentoFully
  → blobs/ path: remove only if url_file refcount === 1
  → thumbnail: remove only if contentHash refcount === 1
```

## Modules

| Module | Responsibility |
|--------|----------------|
| `document-thumbnail-generate.server.ts` | sharp PDF page 0 / image → WebP |
| `document-preview-deliver.server.ts` | HIT/MISS orchestration |
| `document-semantic-classify.ts` | Filename/category heuristics |
| `document-content-hash.ts` | Client Web Crypto SHA-256 |
| `document-thumbnail.tsx` | Lazy list UI |

## Hard rules

- No full `deliverDocumentFile` in list components
- Preview URLs built client-side (`buildDocumentPreviewUrl`)
- No `select('*')` in intelligence server modules
- Thumbnails keyed by content hash, not document id
