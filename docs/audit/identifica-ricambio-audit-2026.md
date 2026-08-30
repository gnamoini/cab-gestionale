# Audit Identifica Ricambio — 2026

## 1. Executive summary

Pipeline Ricambi AI allineata al criterio **documento ready ⇒ searchable**: routing listino SSOT, quality gate multi-criterio, OCR probe per-pagina, OEM triple-store, retrieval ibrido structured + File Search con metriche rescue.

## 2. Stato prima

- `categoria='listino'` (DB) non instradava al parser listino (`listini` hardcoded).
- `ready` con 1 riga su 300 pagine.
- File Search upload-only, mai interrogato in ricerca.
- Foto uploadate ma non inviate al modello visivo.

## 3. Root cause P0

| Issue | Fix |
|-------|-----|
| listino vs listini | `isListinoDocument()` SSOT |
| ready debole | `evaluateExtractionQuality()` |
| quota listino | preflight `estimateListinoPdfGeminiCalls` |
| retrieval gap | exact `part_number_search` + File Search fallback |

## 4. Implementazione per fase

### Fase 1 — SSOT + quality gate
- `lib/documents/document-listino-detect.ts`
- `lib/ai/spare-parts/understanding/extraction-quality-gate.server.ts`
- `finalizeDocumentUnderstanding` con stati `ready` / `ready_with_warnings` / `failed`
- Migration `20261229120000_spare_parts_oem_quality_gate.sql`

### Fase 2 — OCR probe
- `lib/ai/pdf-text-pages.server.ts`
- `lib/ai/spare-parts/understanding/pdf-page-quality-probe.server.ts`
- `lib/ai/pdf-ocr.server.ts` (bridge Tesseract)
- Hint nativi + flag pagine scan nei chunk catalogo

### Fase 3 — Estrazione affidabile
- Finalize dopo validazione (throw se failed)
- Chunk errors tracciati; >50% falliti → failed
- `document_ai_exploded_views` popolato per source diagram
- Batch insert 200 righe + colonne OEM

### Fase 4 — Retrieval ibrido
- `oem-code-normalize.ts` + exact match
- `buildCatalogSearchQuery()` unificato
- `file-search-catalog.server.ts` fallback + metriche rescue
- Foto multimodali in `search-orchestrator`

### Fase 5 — Worker / osservabilità
- Retry understanding su `failed` con backoff (60 min quota)
- `logAiObs` eventi understanding + file search + rescue
- UI badge: `ready_with_warnings` → catalogo ready

### Fase 6 — Test e benchmark
- `lib/regression/spare-parts-searchable-ready.test.ts`
- `lib/regression/spare-parts-listino-routing.test.ts`
- `scripts/bench/spare-parts-index-benchmark.ts`
- `scripts/diag/spare-parts-document-trace.ts`

## 5. Quality gate

| Stato | Condizioni |
|-------|------------|
| failed | 0 parts/pages, chunk <50%, no page evidence |
| ready_with_warnings | chunk <85%, OCR >35%, poche righe su molte pagine |
| ready | tutti i criteri minimi |

## 6. Metriche retrieval

`structured_hits`, `file_search_hits`, `structured_only`, `file_search_rescued`, `both` — in `result_json.retrievalMetrics`.

## 7. Migration DB

- Colonne `part_number_raw|normalized|search`
- `understanding_status` + `ready_with_warnings`
- `document_ai_index_is_usable` v2 (part refs + page link)

## 8. Verifica manuale consigliata

1. Re-indicizza listino Schmidt (`categoria=listino`).
2. `npx tsx scripts/diag/spare-parts-document-trace.ts <id>`
3. Identifica ricambio con codice noto → hit catalogo + evidence `page_number`.
4. Con structured vuoto → fallback File Search in stages.

## 9. Rischi residui

- Quota Gemini free su listini lunghi (>18 chunk stimati → fail fast).
- OCR full-page senza canvas: vision Gemini su chunk scan.
- File Search latency/costo — fallback solo sotto soglia structured.

## 10. Target recall

Misurare con benchmark fixture: `extraction_recall` e `retrieval_recall` ≥ 0.95 su codici noti seed per documento reale.
