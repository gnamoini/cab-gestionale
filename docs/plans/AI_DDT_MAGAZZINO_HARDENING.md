# Piano hardening — AI DDT Magazzino

**Data:** 2026-07-18  
**Riferimento:** piano v2 revisione architetturale

---

## Bug trovati (RCA)

| ID | Bug | Severità | Fix |
|----|-----|----------|-----|
| B1 | `result.data` vs `result.data.object` in AI parse | P0 | `ddt-extraction-analysis.ts` |
| B2 | Codice DDT non normalizzato SSOT | P0 | `lib/inventory/normalization.ts` |
| B3 | Nessun recovery upload interrotto | P1 | pending API + banner |
| B4 | Review qty-only, no confidence gate | P1 | `confidence-gate.ts` + panel |
| B5 | Duplicate 409 senza documentId client | P1 | API + dialog |
| B6 | `import_file_results` non collegato | P2 | `recordImportFileResult` post-analyze |
| B7 | Nessun audit analyze | P2 | `AI_ANALYSIS_COMPLETED` |
| B8 | Route upload-policy ridondante | P2 | Delete route |
| B9 | Wizard confirm-review non verificato | P0 | Error check |

---

## Backlog implementazione

### P0 — Fondamenta
- [x] Fix AI parse object access
- [x] `inventoryReceivingStatusToUiStatus()`
- [x] `normalizeItemCode` / `normalizeItemDescription` + matching
- [x] `lib/import-processing/apply-lock.ts` (documentazione + guard applicativo)
- [x] Wizard confirm-review error handling

### P1 — UX parity
- [x] Confidence gate review
- [x] Line action picker
- [x] Acquisition progress checklist
- [x] Analyze retry in modal
- [x] Duplicate dialog con link doc
- [x] Pending recovery banner
- [x] Modal primary; `/nuovo` resume-only
- [x] Toolbar CTA md/h-11

### P2 — Osservabilità
- [x] `AI_ANALYSIS_COMPLETED` audit
- [x] `import_file_results` linkage
- [x] `traceInventoryReceivingOperation`
- [x] Remove redundant upload-policy route

---

## Test

| File | Copertura |
|------|-----------|
| `lib/inventory/normalization.test.ts` | Codice normalizzato |
| `lib/inventory-receiving/documents/inventory-receiving-ui-status.test.ts` | Mapper UI |
| `lib/inventory-receiving/matching/confidence-gate.test.ts` | Soglie review |
| `lib/inventory-receiving/matching/inventory-matching-engine.test.ts` | Match tiers |
| `e2e/smoke/inventory-receiving-ddt.spec.ts` | Smoke route |

---

## Rischi residui

- OCR foto inclinate: mitigato da confidence gate, non eliminato
- `PARTIALLY_APPLIED`: mostrato come "Applicato (parziale)" in UI
- Apply-lock unificato capture+DDT: RFC P2, non bloccante v1
- Zeri iniziali codice: regola `normalizeItemCodeLoose` — validare su dati cliente

---

## Report problemi risolti (post-implementazione)

| Area | Risoluzione |
|------|-------------|
| AI parse | `result.data.object` in `ddt-extraction-analysis.ts` |
| Matching codici | SSOT `lib/inventory/normalization.ts` + `catalog-code-index.ts` |
| Stati UX | `inventoryReceivingStatusToUiStatus()` — nessuna migration enum DB |
| Recovery | `GET /api/magazzino/receiving/pending` + banner lista/modal |
| Review | Confidence gate + action picker + candidati su GET arricchito |
| Duplicate | `duplicateDocumentId` in 409 + link documento esistente |
| Apply lock | `assertApplyAllowed` + RPC `FOR UPDATE` esistente |
| Audit | `AI_ANALYSIS_COMPLETED` in log_modifiche post-analyze |
| Import linkage | `import_file_results` via `recordImportFileResult` |
| Upload | Rimossa route ridondante `receiving/upload-policy` |
| Modal primary | `/nuovo` resume-only; launcher `md`/`h-11` in toolbar |

Test verdi: normalization, ui-status, confidence-gate, matching-engine.
