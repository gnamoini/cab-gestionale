# TKB Publish Runbook

## Flow

1. Adapter plugin estraggono dati operativi attivi (tier strutturato → testo)
2. `MergeEngine` unisce fragment con policy di precedenza
3. `Canonicalizer` + hash deterministico
4. Quality gates (validazione, benchmark, soglie coverage/OAR/THR)
5. Insert atomico `tkb_published_snapshots` (idempotente su `draft_hash`)
6. Description Engine legge **solo** snapshot pubblicati (`/api/tkb/snapshot` o cache server)

## Bozza vs pubblicato

- `tkb_draft_store` — bozza aggiornata da sync eventi (debounce 30s)
- Publish admin — **full build** obbligatorio

## Rollback

Non modificare snapshot published. Pubblicare nuova `kb_version` correttiva.

## Audit

Colonne `pipeline_version`, `build_stats`, `build_duration_ms`, `app_git_sha` su `tkb_published_snapshots`.

## Test

```bash
npx tsx lib/domain/technical-knowledge-base/canonicalize.test.ts
npx tsx lib/domain/technical-knowledge-base/merge/merge-engine.test.ts
npx tsx lib/preventivi/description-engine/operative-history/operative-history.test.ts
```
