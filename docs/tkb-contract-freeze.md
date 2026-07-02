# TKB + Description Engine — Contract Freeze

Checklist gate **Fase 0c → 1b**:

- [x] `TkbPublishedSnapshot` schemaVersion 1 con Zod
- [x] `GeneratedDescriptionLine` + `DescriptionEngineMeta` contratti
- [x] Snapshot round-trip test
- [x] Publish idempotente test
- [x] Provenance validation test
- [x] Confidence tier boundaries test
- [x] Benchmark THR gate su seed dataset

## Test esecuzione

```bash
npx tsx lib/preventivi/trasforma-descrizione.test.ts
npx tsx lib/domain/technical-knowledge-base/contracts/tkb-snapshot.contract.test.ts
npx tsx lib/preventivi/description-engine/contracts/provenance.contract.test.ts
npx tsx lib/domain/technical-knowledge-base/benchmark/benchmark.test.ts
npx tsx lib/preventivi/description-engine/description-engine.test.ts
npx tsx scripts/tkb-benchmark-build.ts
```

## Invarianti

- DE legge solo `tkb_published_snapshots.snapshot_json`
- Provenance in `description_generation_lines`, non in dettagli JSONB
- `generationId` ≠ `generationContextHash`
- Legacy righe: `isVerifiedTechnical: false`
