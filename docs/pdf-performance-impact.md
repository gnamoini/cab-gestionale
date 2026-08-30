# PDF performance impact — server artifact pipeline

## Before (client jsPDF)

| Metric | Behavior |
|--------|----------|
| Client CPU | jsPDF + autotable on every export click |
| Client DB | React Query caches + row assembly in browser for list PDF |
| Repeat export | Full regeneration every time |
| Delivery | `POST /api/pdf/preview` pass-through blob (no cache) |

## After (server artifacts + cache-first metadata)

| Metric | Behavior |
|--------|----------|
| Client CPU | **Eliminated** for migrated types — sync anchor `GET` |
| Server HIT | Metadata leggera + storage (no full DTO, no jsPDF, no `resolvePdfAutore`) |
| Server MISS | Full fetch + jsPDF + best-effort upload |
| Browser cache | `ETag` + `private, max-age=300` + `304` (see `docs/pdf-http-cache-audit.md`) |

## Instrumentation

| Header | Meaning |
|--------|---------|
| `X-Cache-Status` | `HIT` / `MISS` |
| `X-PDF-Generate-Ms` | Total wall time |
| `X-PDF-Phase-*-Ms` | auth, data, hash, storage, generate, upload |
| `Server-Timing` | Same phases |

Benchmark: `npm run benchmark:pdf-subsystem` (labels offline; artifacts via `PDF_BENCH_BASE_URL`).

## Invalidation

Hash input changes on record update. Label QR: `qrToken` in fingerprint + purge on `QR_REGENERATED`.
