# RCA — AI Ricezione Ricambi da DDT (Inventory Receiving)

**Data:** 2026-07-18  
**Stato:** Post-v1 hardening audit  
**Dominio:** `inventory-receiving` / page `magazzino_carichi`

---

## 1. Architettura a layer

```
Upload (client)
  → import-files/upload-policy + storage import-sources + finalize
  → import_files (kind=ddt_receiving)
  → POST /api/magazzino/receiving/analyze
  → ddt-extraction-processor (AI + matching)
  → inventory_documents + inventory_document_lines
  → confirm-review → inventory_receiving_apply RPC
  → magazzino_ricambi + movimenti_ricambi + log_modifiche
```

**Posizione nel framework inbound:**

```
import-files (SSOT upload)
  → AI runtime (generateObject)
  → domain consumer: inventory-receiving
  → stock movement engine (RPC apply)
```

Non fork di `document-capture`. Non uploader parallelo in `inventory-receiving`.

### Componenti

| Layer | Path |
|-------|------|
| UI modal | `components/gestionale/magazzino/carichi/magazzino-carichi-capture-launcher.tsx` |
| UI resume page | `components/gestionale/magazzino/carichi/receiving-wizard.tsx` |
| Flow hook | `use-inventory-receiving-flow.ts` |
| Client API | `lib/inventory-receiving/inventory-receiving-import-client.ts` |
| Analyze API | `app/api/magazzino/receiving/analyze/route.ts` |
| Processor | `lib/inventory-receiving/extraction/ddt-extraction-processor.server.ts` |
| AI parse | `lib/inventory-receiving/extraction/ddt-extraction-analysis.ts` |
| Matching | `lib/inventory-receiving/matching/inventory-matching-engine.ts` |
| Apply | `lib/inventory-receiving/apply/inventory-receiving-apply-rpc.server.ts` |
| DB | `supabase/migrations/20260919120000_inventory_receiving.sql` |

---

## 2. Audit Upload

| Controllo | Esito |
|-----------|-------|
| Componente | `GestionaleUploadDropExpand` + `useImportFileUpload` |
| Kind | `ddt_receiving` |
| MIME | PDF, jpeg, png, webp, gif |
| Max size | 15MB (`import-file-mime.server.ts`) |
| Multipagina PDF | Passato a Gemini come file intero |
| Drag & drop | Sì (modal) |
| Progress | `DocumentCaptureAcquisitionProgress` (upload + analyze) |
| Retry upload | No automatico; utente riseleziona file |

**Gap (pre-hardening):**
- Recovery sessione incompleta: abandon solo su close modal
- Nessun banner "Analisi in sospeso" da `import_files.uploaded/processing`
- Route ridondante `app/api/magazzino/receiving/upload-policy` (non usata dal client)

**Mitigazione hardening:** API pending + banner resume; abandon esplicito.

---

## 3. Audit Storage

| Controllo | Esito |
|-----------|-------|
| Bucket | `import-sources` |
| Path | `{companyId}/imports/ddt_receiving/{fileId}/{fileName}` |
| Company isolation | RPC `import_file_create_upload_policy` |
| Preview | Signed URL `file-url/route.ts` |
| Cleanup | `abandonImportFile`, cron `expire_import_files` |

**Rischio:** upload OK + doc `FAILED` lasciato da duplicate semantic → riga orfana. Mitigazione: dialog duplicate con link doc esistente.

---

## 4. Audit AI Pipeline

| Aspetto | DDT | Document Capture |
|---------|-----|------------------|
| Runtime | `aiService.generateObject` | `analyzeDocument` / pipeline v4.1 |
| Schema | Zod `ddtExtractionSchema` | Registry plugin |
| Operation | `ddt_receiving_import` | capture ops |
| Timeout | `readRuntimeTimeoutMs()` | stesso |
| Retry UI | Assente (pre-hardening) | `useRetryAfterCountdown` |
| Telemetry | Assente (pre-hardening) | `traceDocumentCaptureOperation` |
| Rate limit | In-memory 10/min | DB-backed |

**Bug P0:** `ddt-extraction-analysis.ts` usava `result.data` come extraction invece di `result.data.object`.

---

## 5. Qualità estrazione — casi test

| Caso | Risultato atteso | Problema noto | Fix |
|------|------------------|---------------|-----|
| PDF digitale testo selezionabile | Alta accuracy righe/codici | — | — |
| PDF scannerizzato | OCR via Gemini vision | Confidence variabile | Confidence gate review |
| Foto smartphone inclinata | Estrazione parziale | Righe mancanti | Warnings + review obbligatoria |
| Multipagina | Prompt "tutte le pagine" | Merge righe duplicate | Somma quantità in prompt |

*Esecuzione manuale con DDT reali cliente — fixture CI con stub analyze.*

---

## 6. Matching

Tier attuale:
1. Codice catalogo (`findDuplicateByCodici`)
2. Codice fornitore (`meta.fornitoriAlternativi`)
3. Fuzzy descrizione

**Gap:** codice DDT non normalizzato uniformemente (`ABC-001` vs `ABC001`, `000123` vs `123`).

**Fix:** SSOT `lib/inventory/normalization.ts` → `normalizeItemCode()` usato nel matching.

---

## 7. Apply

- RPC `inventory_receiving_apply`: `FOR UPDATE` su documento, idempotenza per riga (`apply_status=applied`)
- Rischio doppio click UI: mitigato con `LoadingButton` + check status `APPLIED`
- Lock condiviso cross-domain: RFC P2 (`lib/import-processing/apply-lock.ts`)

---

## 8. Audit log

| Fase | Pre-hardening | Target |
|------|---------------|--------|
| Analyze OK | Nessuno | `AI_ANALYSIS_COMPLETED` su `inventory_documents` |
| Confirm review | Nessuno | UPDATE summary |
| Apply | 1× header | Invariato + batch ricambi/movimenti P2 |

---

## 9. Performance

- Catalogo magazzino caricato intero in RAM per analyze — OK v1, monitorare >2000 righe
- Mitigazione P1: mappa `normalizeItemCode(codice)→id` precomputata
- Rate limit in-memory non distribuito — P2 migrate pattern DB

---

## Riferimenti

- Audit pre-v1: [`AI_DDT_MAGAZZINO_AUDIT.md`](AI_DDT_MAGAZZINO_AUDIT.md)
- Design compare: [`AI_DDT_VS_IMPORT_AI_DESIGN.md`](AI_DDT_VS_IMPORT_AI_DESIGN.md)
- Piano hardening: [`../plans/AI_DDT_MAGAZZINO_HARDENING.md`](../plans/AI_DDT_MAGAZZINO_HARDENING.md)
