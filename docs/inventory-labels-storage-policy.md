# Inventory labels — storage policy (IL-020)

**Stato:** documentato — nessun cron cleanup in produzione (Fase 3 plan).

## Path convention

```
pdf-artifacts/inventory-labels/{entity_type}/{entity_id}/{hash}.{format}
```

Bulk job results:

```
pdf-artifacts/inventory-labels/bulk-jobs/{job_id}/{hash}.pdf
```

## Retention proposta (non implementata)

| Tipo | TTL proposta | Note |
|------|--------------|------|
| `inventory_label_artifacts` | 90 giorni | Dopo purge su QR regenerate o fingerprint miss naturale |
| `label_generation_jobs` (completed) | 24 ore | Path risultato bulk |
| Orphan storage | — | Oggetti senza riga DB |

## Purge event-driven (implementato)

Su `POST .../regenerate`:

1. Revoca token DB
2. DELETE righe `inventory_label_artifacts` (obbligatorio)
3. DELETE storage best-effort (failure non blocca regenerate)
4. Evento `QR_REGENERATED` con `purgedArtifactCount` / `storageDeleteFailures`

Modifica dati ricambio → nuovo fingerprint → cache MISS senza purge esplicito.

## Future cron (stub)

`listOrphanArtifactPathsHint()` in `lib/inventory-labels/storage/artifact-purge.server.ts` — ponytail: scan storage vs DB per cleanup batch futuro.

## Finding IL-020

Chiuso come **documented + contract**, non **remediated** (no cron in questo hardening).
