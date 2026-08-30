# PDF artifacts consistency audit

Audit gate per fast-path `current_pdf_artifact_id` → storage (preventivo/DDT).

## Invariante richiesta

```text
DB pointer (preventivi.current_pdf_artifact_id / ddt_documents.current_pdf_artifact_id)
      ↓
pdf_artifacts.hash + status=ready + is_current=true
      ↓
storage_path in bucket pdf-artifacts
      ↓
contenuto PDF coerente con stato entità
```

## Writer verificati

| Evento | Writer | Invalidazione |
|--------|--------|---------------|
| Commit DDT ufficiale | `commit_ddt_pdf_artifact` RPC | Nuova versione artifact + pointer |
| Persist DDT | `persistDdtOfficialPdfServer` | Upload + RPC |
| Preventivo lifecycle | `preventivo-status-transition.server.ts` | `current_pdf_artifact_id` su transizioni |
| Delivery generico | `deliverPdfArtifact` | Content-hash path (non usa pointer DB) |

## Decisione implementazione

**Fast-path pointer DB: NON abilitato** in questa iterazione.

Motivo: il delivery SSOT resta **content-addressed storage** via `stableHashPayload` + `getCachedPdfArtifactBytes`. Il pointer `pdf_artifacts` serve lifecycle/portale/audit; allineamento hash DB ↔ metadata leggera va verificato per ogni mutazione parziale (anagrafica cliente, righe JSON preventivo) prima di saltare il ricalcolo hash.

## Edge case documentati

1. **Anagrafica cliente aggiornata** — hash preventivo/DDT include `anagUpdatedAt`; metadata leggera + `resolveClienteAnagUpdatedAt` mantiene coerenza senza full DTO su HIT.
2. **QR etichetta rigenerato** — fingerprint include `qrToken` (IL-016); purge artifact su `QR_REGENERATED` resta attivo.
3. **Artifact status != ready** — delivery via storage hash ignora pointer non-ready; nessun HIT stale da pointer.

## Prossimo step (se richiesto)

Test di regressione dedicato: mutazione anagrafica → stesso `dataHash` finché `anagUpdatedAt` non cambia; cambio anagrafica → MISS → nuovo PDF.
