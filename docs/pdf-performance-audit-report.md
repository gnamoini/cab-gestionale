# PDF PERFORMANCE AUDIT — Report

Eseguire `npm run benchmark:pdf-subsystem` prima e dopo le modifiche. Per artifact HTTP: `PDF_BENCH_BASE_URL=http://localhost:3000 npm run benchmark:pdf-subsystem`.

## Root cause

- **#1** Cache storage dopo full DTO fetch → risolto con metadata leggera + storage HIT prima del full fetch (preventivo, DDT, fattura, ordine).
- **#2** `resolvePdfAutore` su ogni request → solo branch MISS (schede, preventivo MISS).
- **#3** Browser `no-store` → `ETag` + `max-age=300` + `304` (audit in `docs/pdf-http-cache-audit.md`).
- **#4** Etichette: raster sharp dominante; mezzo senza cache/concurrency → cache artifact + `mapWithConcurrency`.
- **#5** Viewer fetch+blob residuo su bulk mezzo >50 → anchor sync per ≤50; POST bulk oltre soglia resta fetch+blob.
- **#6** `pdf_artifacts` pointer fast-path non abilitato — audit `docs/pdf-artifacts-consistency-audit.md`.

## Correzioni

- `lib/pdf-artifacts/pdf-artifact-metadata.server.ts` — hash metadata leggera
- `lib/pdf-artifacts/pdf-artifact-generate.server.ts` — cache-first + phase timing
- `lib/pdf/core/pdf-response.ts` — ETag/304
- `lib/pdf/client/pdf-viewer.ts` — SSOT viewer client
- `lib/inventory-labels/domain/fingerprints.ts` — `qrToken` in fingerprint (IL-016)
- `lib/mezzo-labels/render/deliver.server.ts` — artifact cache
- `scripts/benchmark-pdf-subsystem.ts` — benchmark matrice scenari

## Benchmark (compilare dopo run locale)

| Caso | Scenario | p50 ms | p95 ms |
|------|----------|-------:|-------:|
| inventory-label | count=500 | 26599 | 26599 |
| mezzo 50×22 | count=1 | 79 | 79 |
| mezzo 50×22 | count=500 | 11884 | 11884 |

## Security impact

Nessuno — RBAC invariato; cache browser `private`; nessun bypass storage/RLS.

## Tests

`npm run lint`, `npm run ci:tsc`, policy tests PDF, `lib/pdf/core/pdf-response.test.ts`, `lib/inventory-labels/domain/fingerprints-qr-token.test.ts`.
