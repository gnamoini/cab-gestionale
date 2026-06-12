# Document delivery map

Unified proxy delivery for user-uploaded files in the private `documenti` bucket.

## Classification

| Class | Source | Table | Storage path | Delivery |
|-------|--------|-------|--------------|----------|
| UPLOAD — archive | Documenti page | `public.documenti` | `{uuid}/{file}` | `GET /api/documents/:id?source=archive` |
| UPLOAD — lavorazione PDF | Lavorazioni hub / client portal | `public.lavorazione_documents` | `lavorazioni/{id}/ddt.pdf` etc. | `GET /api/documents/:id?source=lavorazione&tipo=` |
| GENERATED | PDF artifacts | — | `pdf-artifacts` bucket | `/api/pdf/artifacts` (separate pipeline) |
| STORED metadata | DB rows | both | pointer only | List queries — no binary |

## Flows

### Upload (archive)

```
UI dropzone → blob: preview (local only)
  → POST /api/documents/upload-policy (RBAC + MIME/size)
  → client storageUpload(documenti, allowedPath)
  → documentiService.create(row)
```

### Upload (lavorazione PDF)

```
UI file picker → POST /api/documents/upload-policy (source=lavorazione)
  → client storageUpload → lavorazioneDocumentsService.upload
```

### Metadata list

```
DocumentiView → useDocumentiListQuery (DOCUMENTI_COLUMNS, staleTime 5m)
  → no signed URLs, no binary prefetch
```

### Preview / download

```
UI click → buildDocumentDeliveryUrl(id, { source, mode, tipo?, v? })
  → GET /api/documents/:id (RBAC + DB path resolve + storage stream)
  → Cache-Control: immutable
```

## Client entry

[`lib/documents/document-delivery-url.ts`](../lib/documents/document-delivery-url.ts) — `buildDocumentDeliveryUrl`

## Hard rules

- No `storageCreateSignedUrl` in UI list/open paths
- No `listWithUrls` on lavorazione document lists
- Binary access only via same-origin proxy
