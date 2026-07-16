# Document Capture — Architecture ADR v4.1 (freeze)

**Status:** Accepted  
**Context:** CAB / FleetCare Pro — acquisizione digitale schede officina  
**Scope:** Pipeline enterprise PDF → lavorazioni con separazione dominio/AI

## Decision

Adottare pipeline a layer con **DocumentModel** come SSOT, **Validation Engine** deterministico, **Document Domain Service** + **Duplicate Detection** separati, **Pipeline Orchestrator** con idempotency per fase.

L'AI produce `ExtractionResult`; il **Schema Projector** mappa formato (zero deduzioni); il wizard legge solo viste rigenerabili (`ValidationResult`, `InterpretationModel`) e modifica solo `DocumentModel`.

## Pipeline

```
PDF → Orchestrator → PhysicalParser → PageObjects (view)
  → AIExtraction → ExtractionResult (persist)
  → SchemaProjector → DocumentModel (persist)
  → ValidationEngine → ValidationResult (view)
  → DocumentDomainService → DuplicateDetectionService → InterpretationModel (view)
  → ApplyPlan (persist) → InterventoWriteSaga
```

## Invarianti (INV-01..18)

| ID | Regola |
|----|--------|
| INV-01 | Ogni pagina appartiene a un solo documento |
| INV-02 | Ogni campo ha una sola provenienza attiva |
| INV-03 | Modifica manuale tracciata con `overrideReason` |
| INV-04 | Validation Engine deterministico |
| INV-05 | AI non modifica DocumentModel |
| INV-06 | Wizard non legge ExtractionResult |
| INV-07 | Apply usa solo ApplyPlan |
| INV-08 | Projection flat senza logica business |
| INV-09 | Ogni prompt versionato nel Prompt Registry |
| INV-10 | Documento riproducibile |
| INV-11 | Physical Parser senza semantica |
| INV-12 | InterventionCandidate solo in InterpretationModel |
| INV-13 | Regole solo nel Rule Engine tipizzato |
| INV-14 | Fasi idempotenti (PipelineExecution + idempotency key) |
| INV-15 | Stesso model hash + ruleSetVersion + validationEngineVersion → stesso ValidationResult |
| INV-16 | Artefatti derivati dichiarano versioni riproduzione |
| INV-17 | ApplyPlan solo se documentModelVersionHash corrente |
| INV-18 | Modifica manuale → evento audit utente |

### Wizard (WIZ-01..03)

- **Read:** ValidationResult, InterpretationModel  
- **Edit:** DocumentModel  
- **Never:** ExtractionResult, edit ValidationResult  

### Coerenza pipeline (COH-01..04)

- COH-01: `analysis.completed` → `upload.uploaded`  
- COH-02: `validation.*` → `analysis.completed`  
- COH-03: `apply.running` → validation non `blocked`  
- COH-04: Solo Orchestrator avanza `pipeline_state`  

## Persistenza

| Persistente | Rigenerabile |
|-------------|--------------|
| document_model jsonb | PageObjects |
| pipeline_state jsonb | ValidationResult |
| extraction_result (attempts) | InterpretationModel |
| ApplyPlan (applications) | PageTimeline |
| document_capture_events | flat projection |

## Feature flag

`DOCUMENT_CAPTURE_V41=1` abilita pipeline v4.1; `0` mantiene legacy flat map.

`DOCUMENT_CAPTURE_HYBRID_EXTRACTION` (default on) abilita estrazione ibrida: testo nativo PDF → OCR Tesseract su bbox template CAB blank v2 → Gemini solo fallback. Impostare `=0` per tornare a Gemini-only.

## Estrazione ibrida (hybrid)

```
PDF/immagine → PhysicalParser
  → Tier 0: pdfjs text layer (PDF digitali)
  → Tier 1: Tesseract su bbox template (scan manoscritti)
  → Merge per field_key
  → Gate campi critici → skip Gemini se sufficiente
  → Gemini fallback con prefill JSON (token ridotti)
```

Code: `lib/document-capture/extraction/` (`native-pdf-text-extractor`, `template-ocr-extractor`, `hybrid-extraction-merge`, `run-hybrid-extraction`).

## Code map

- `lib/document-capture/model/` — contratti SSOT  
- `lib/document-capture/physical/` — Physical Parser  
- `lib/document-capture/extraction/` — Projector  
- `lib/document-capture/rules/` — Rule DSL + Validation Engine  
- `lib/document-capture/domain/` — Domain + Duplicate  
- `lib/document-capture/orchestrator/` — Pipeline Orchestrator  
- `lib/document-capture/registry/` — DocumentTypeRegistry, PromptContract  
- `lib/document-capture/projection/` — flat legacy projection  

## Migration

`supabase/migrations/20260910151000_document_capture_v41_model.sql` — colonne `document_model`, `pipeline_state`.
