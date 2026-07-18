# AI DDT vs AI Lavorazioni — Parity Audit

**Date:** 2026-07-18  
**Extends:** [AI_DDT_VS_IMPORT_AI_DESIGN.md](../investigation/AI_DDT_VS_IMPORT_AI_DESIGN.md)  
**Contract:** [DOCUMENT_CAPTURE_EXPERIENCE_CONTRACT.md](../design/DOCUMENT_CAPTURE_EXPERIENCE_CONTRACT.md)

## Architecture

| Layer | Lavorazioni | DDT |
|-------|-------------|-----|
| Launcher | `lavorazioni-digital-capture-launcher.tsx` | `magazzino-carichi-capture-launcher.tsx` |
| Adapter | `lavorazioni-capture-adapter.ts` | `inventory-receiving-capture-adapter.ts` |
| Upload SSOT | `useDocumentCaptureUpload` | `useImportFileUpload` (`ddt_receiving`) |
| DB | `document_capture_*` | `inventory_documents` |
| Apply | `useCaptureApplyFlow` + ADR-005 | `useInventoryReceivingApply` + engine adapter |

## Step matrix (1–10)

| Step | Lavorazioni | DDT | Status |
|------|-------------|-----|--------|
| 1 Open | `GestionaleAiActionButton` toolbar | `Carico DDT AI` toolbar | OK |
| 2 Upload | `DocumentUploadZone` | `DocumentUploadZone` | **Done** |
| 3 Analyze | Bar progress + Gemini retry | Checklist + `CaptureAnalyzeErrorPanel` | **Done** |
| 4 Preview | Pinned preview + compile | `ReceivingReviewSplitLayout` | OK (shell aligned) |
| 5 Mapping | `CaptureFieldRow` | Line decisions | Domain-specific |
| 6 Review table | Field grid | `DocumentCaptureReviewTable` | **Done** |
| 7 Matching | `CaptureMezzoMatchStep` | `EntityMatcher` inline | **Done** (presentation) |
| 8 Confirm CTA | Conferma import | Conferma importazione | **Done** |
| 9 Apply | dry-run → apply | dry-run route + engine | **Done** |
| 10 Audit | `document_capture_events` | `capture-audit-events` vocab | **Done** (vocabulary) |

## Gap list (resolved in this implementation)

| ID | Gap | Resolution |
|----|-----|------------|
| P0-1 | Duplicate step indicators | `GestionaleCaptureStepIndicator` |
| P0-2 | Plain HTML DDT review table | `DocumentCaptureReviewTable` |
| P0-3 | CTA "Conferma carico" | "Conferma importazione" |
| P0-4 | Duplicated `onApply` | `useInventoryReceivingApply` |
| P1-1 | No DDT analyze retry UX | `CaptureAnalyzeErrorPanel` |
| P1-2 | No `partial_success` state | `CaptureReviewState` |
| P1-3 | No DDT dry-run | `/api/magazzino/receiving/[id]/dry-run` |
| P2-1 | No parity regression test | `ai-capture-parity.test.ts` |

## Remaining (out of scope)

- Page-level drop on Magazzino list (Lavorazioni has toolbar drop; DDT uses modal only)
- Full catalog matcher merge (`inventory-matching-engine` ↔ `ricambi-resolution`)
- DDT events persisted to `document_capture_events` (uses domain telemetry + `log_modifiche`)

## Component map

```
components/document-capture/
  gestionale-capture-step-indicator.tsx   # SSOT step nav
  document-upload-zone.tsx
  capture-acquisition-progress-panel.tsx
  document-capture-review-table.tsx
  capture-review-warnings.tsx
  capture-analyze-error-panel.tsx
  entity-matcher.tsx

lib/document-capture/
  capture-experience-adapter.ts
  lavorazioni-capture-adapter.ts
  inventory-receiving-capture-adapter.ts
  capture-review-state.ts
  apply/capture-apply-engine.ts
  use-inventory-receiving-apply.ts
```
