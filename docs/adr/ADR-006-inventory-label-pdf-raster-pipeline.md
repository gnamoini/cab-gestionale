# ADR-006: Inventory label PDF raster pipeline

## Status

Accepted — 2026-07-17

## Context

Bulk label PDF on Vercel failed with invisible text (fontconfig/librsvg) and OOM on large batches. Operators need reliable print output identical to the on-screen layout.

## Decision

1. **Primary pipeline (V2, default on):** `LabelPayload` → SVG with opentype text paths → sharp PNG @ 300 DPI → jsPDF A4 grid.
2. **Concurrency:** `LABEL_PDF_RENDER_CONCURRENCY` default **4**, clamped 2–8. Log `peakHeap` per batch.
3. **Fallback:** reduced-DPI raster (150 DPI, concurrency 1) → same jsPDF assembly.
4. **Emergency:** ZIP of per-label PNG (or SVG if PNG fails) — never a total dead end.
5. **Async jobs:** `label_generation_jobs` is SSOT with `progress` 0–100 and `error_code`. `waitUntil` accelerates only.
6. **Sync cap:** `BULK_SYNC_MAX` default **20** (`LABEL_BULK_SYNC_MAX` override). Above → 202 + job poll.
7. **Timeout:** `LABEL_PDF_GENERATION_TIMEOUT_MS` default 240s → `LABEL_PDF_TIMEOUT` / HTTP 504.
8. **Rollback:** `INVENTORY_LABEL_PDF_PIPELINE_V2=0` restores legacy embedded-font SVG path (emergency only).

## Benchmark (locale, concurrency=4)

| count | durationMs | peakHeapMb | bytes | pipeline |
|-------|------------|------------|-------|----------|
| 1 | ~270 | ~59 | ~44k | primary |
| 10 | ~785 | ~77 | ~429k | primary |
| 50 | ~3600 | ~92 | ~2.1M | primary |
| 100 | ~6500 | ~125 | ~4.3M | primary |

Sotto soglia ~70% budget Lambda 1GB (Hobby). Concurrency default 4 confermata.

Rigenerare con:

```bash
npm run benchmark:label-pdf-memory
```

Target: peak heap &lt; ~70% of runtime memory budget at count=100 with default concurrency 4.

## Audit events

`LABEL_PDF_BULK_STARTED` | `LABEL_PDF_BULK_COMPLETED` | `LABEL_PDF_BULK_FAILED` on `inventory_label_events`.

## Recovery

Jobs stuck in `running`/`pending` after Lambda death: re-trigger bulk or admin documents manual retry (ponytail: no cron yet).

## Consequences

- `GENERATOR_VERSION` bumped on pipeline changes (currently 1.3.32).
- Emergency ZIP returns `application/zip`; UI handles download fallback.
