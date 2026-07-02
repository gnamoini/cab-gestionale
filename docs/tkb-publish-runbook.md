# TKB Publish Runbook

## Flow

1. Modifiche entità KB in stato `draft`
2. Submit → `review`
3. Validazione schema (`activityId` obbligatorio)
4. RPC `publish_tkb` (transaction atomica):
   - Calcola `draft_hash`
   - Se uguale all'ultimo published → idempotente (no nuova kbVersion)
   - Altrimenti incrementa `kbVersion`, insert `tkb_published_snapshots`
5. Description Engine legge **solo** `snapshot_json`

## Rollback

Non si modifica uno snapshot published. Si pubblica una nuova versione con delta correttivo.

## Audit preventivo storico

`preventivi.dettagli.descriptionEngineMeta.kbVersion` → query snapshot per ricostruzione KB esatta.
