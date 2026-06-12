# PDF performance impact — server artifact pipeline

## Before (client jsPDF)

| Metric | Behavior |
|--------|----------|
| Client CPU | jsPDF + autotable on every export click |
| Client DB | React Query caches + row assembly in browser for list PDF |
| Repeat export | Full regeneration every time |
| Delivery | `POST /api/pdf/preview` pass-through blob (no cache) |

## After (server artifacts)

| Metric | Behavior |
|--------|----------|
| Client CPU | **Eliminated** for migrated types — `window.open(GET)` only |
| Server generation | One DTO fetch + jsPDF per cache miss |
| Repeat export | **~100% cache hit** when data hash unchanged (storage + CDN headers) |
| Delivery | `GET /api/pdf/artifacts/:type` with `Cache-Control: immutable` |

## Instrumentation

Artifact route response headers:

| Header | Meaning |
|--------|---------|
| `X-Cache-Status` | `HIT` (storage) or `MISS` (generated) |
| `X-PDF-Generate-Ms` | Wall time for resolve + fetch/generate path |
| `X-PDF-Data-Hash` | Content hash used in storage path |

Server logs: search Vercel function logs for artifact type + `X-PDF-Generate-Ms` on misses.

## Targets (indicative)

| Artifact | Target |
|----------|--------|
| `lavorazioni-in-corso` | 0 client DB queries; repeat export = storage HIT |
| `report-bundle` | Single server REPORT prefetch; hash excludes `generatedAt` |
| Document types | Hash bumps on record `updatedAt` / content change only |

## Invalidation

`POST /api/pdf/artifacts/invalidate` (admin) removes objects under `type/scopeId/`. Domain mutations should call invalidate or rely on hash input changes.
