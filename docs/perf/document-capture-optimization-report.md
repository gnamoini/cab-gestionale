# Document Capture Optimization Report

Data: 2026-07-29

## Obiettivo

Ridurre latenza percepita e reale del flusso **Document Capture** (scheda officina → lavorazione), eliminare I/O duplicati, introdurre progresso NDJSON con heartbeat, rimuovere il riconoscimento automatico firme (pad manuale invariato).

## Architettura finale

```
Upload (storage) → POST /api/document-capture/[id]/process (NDJSON)
  → download bytes (una volta)
  → finalizeCaptureFromBytes (se necessario)
  → analyzeDocumentCaptureV41(bytes, onPhase)
  → compile review (fast path sync → slow hints async)
```

Moduli separati; orchestratore sottile in `lib/document-capture/pipeline/process-capture.server.ts`.

## Modifiche per area

### Benchmark (Fase 0)

- Script `scripts/bench/document-capture-analyze-benchmark.ts` + `npm run bench:document-capture`
- Output SSOT: `docs/perf/document-capture-baseline.json`
- Metriche UX: `time_to_first_progress`, `time_to_first_data`, `time_to_review_ready`

### Rimozione firme automatiche (Fase 1)

- Eliminato stack crop/Gemini/upsert firme e route `extract-signatures`
- Prompt scheda officina senza istruzioni firma automatica
- Compile/review senza `ensureCaptureSignatureFieldRows`
- **Invariato:** pad manuale (`RichiedenteFirmaCaptureModal`), PDF, `richiedenteFirma` / `addettoFirma` su scheda

### Quick wins (Fase 2)

- Retry Gemini solo errori transient (`lib/ai/gemini-analyze-retry-policy.ts`) — no retry su timeout completo
- Telemetry estesa con metriche UX in `document-capture-telemetry.server.ts`

### NDJSON + heartbeat (Fase 3)

- Stream `application/x-ndjson` su `/process` con fallback JSON
- Heartbeat ~8s durante fasi lunghe (Gemini)
- Checklist lavorazioni in `capture-acquisition-progress` (no creeping bar finta quando stream attivo)

### I/O unificato (Fase 4)

- `processDocumentCapture`: un download, bytes condivisi tra finalize e analyze
- Upload client: solo storage; finalize+analyze nel process endpoint
- Idempotency analyze prima di download/prereq su cache hit

### Parallelizzazione (Fase 5)

- Prereq + download in parallelo quando bytes non forniti
- Post-Gemini: `runSchedaPipelineViews` ∥ `applyEntityResolutionToCaptureFields`
- Entity resolution: `groupTopologicalFieldLevels` + `Promise.all` per livello

### Compile progressivo (Fase 6)

- `buildCaptureIngressoCompileDataFast` (sync) → form subito
- `buildCaptureIngressoCompileHints` (async) → hint catalogo
- `fieldDirtyTracking` (`capture-compile-field-dirty.ts`) — slow merge non sovrascrive edit utente

### Cache resolution SSOT DB (Fase 7)

- Compile legge `normalized_value` da `document_capture_fields`
- Nessun `resolveCaptureGraph` lato client
- Nessuna cache React come SSOT

### Tesseract concurrency (Fase 9 — non implementato)

Criterio piano: OCR >30% tempo totale **e** CPU ok. Implementare solo dopo numeri da `bench:document-capture` in produzione.

## Metriche UX (definizione)

| Metrica | Trigger trace |
|---------|----------------|
| `time_to_first_progress` | `DOWNLOAD_STORAGE_OK` o `HYBRID_START` |
| `time_to_first_data` | `PARSE_OK` |
| `time_to_review_ready` | `END_OK` |

## Timeline percepita (esempio scan foto)

| Tempo | Evento UI |
|-------|-----------|
| 0s | Upload avviato |
| ~1–3s | "Documento ricevuto" (checklist) |
| ~3–15s | "Estrazione OCR" |
| ~15–60s | "Analisi AI" + heartbeat ogni ~8s |
| ~60s | "Preparazione revisione" → form compile fast path |
| +0–2s | Hint catalogo (slow path) |

## Test

- `capture-field-mapper.test.ts` — senza mapping firma capture
- `capture-acquisition-progress.test.ts` — checklist + stream
- `capture-compile-field-dirty.test.ts` — dirty merge
- `gemini-analyze-retry-policy.test.ts` — transient vs terminal
- E2E `document-capture-production.spec.ts` — finalize/analyze ancora validi via route legacy; wizard lavorazioni usa `/process`

## Rischi residui

| Rischio | Mitigazione |
|---------|-------------|
| Proxy bufferizza NDJSON | `Cache-Control: no-transform`; fallback JSON |
| Duplicate SHA solo in `/process` | Launcher gestisce `duplicateOf` da finalize in process |
| Slow hints dopo edit utente | `fieldDirtyTracking` |
| Tesseract concurrency su server piccoli | Benchmark-gated; non abilitato |

## Conferma comportamento

- Flusso capture/analyze/apply invariato salvo firme automatiche rimosse
- Firma manuale pad/PDF/scheda funzionale
