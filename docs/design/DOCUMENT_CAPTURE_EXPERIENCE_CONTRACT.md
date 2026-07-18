# Document Capture Experience Contract

**Status:** Active  
**Scope:** Cross-domain AI document capture (Lavorazioni, DDT, future domains)

## Purpose

Guarantee that every AI capture flow feels like the **same product**. Domain differences are limited to business fields and persistence — never buttons, states, colors, errors, or confirmation patterns.

## Logical steps (mandatory)

| # | Step | UI phase |
|---|------|----------|
| 1 | **Acquire** | Upload / hub |
| 2 | **Analyze** | AI processing |
| 3 | **Review** | Validate extracted data |
| 4 | **Confirm** | Footer CTA + apply |

Today both Lavorazioni and DDT show **3 nav steps**; Confirm is the footer CTA on the review/compile step, not a separate nav item.

## Architecture boundary

```
         DOCUMENT CAPTURE EXPERIENCE
                    |
       --------------------------------
       |                              |
LAVORAZIONI ADAPTER            DDT ADAPTER
       |                              |
document_capture           inventory_documents
       |                              |
apply lavorazioni            apply magazzino
```

DDT is **not** a mode of Lavorazioni. Shared shell, separate domain adapters.

## TypeScript SSOT

`lib/document-capture/capture-experience-adapter.ts` — every launcher declares a `CaptureExperienceAdapter`:

- `domain`: `"lavorazioni" | "ddt"`
- `steps`: configurable step nav (passed to `GestionaleCaptureStepIndicator`)
- `upload`, `review`, `apply`: domain config
- `reviewState`: maps domain data → `CaptureReviewState`

Domain adapters:

- `lib/document-capture/lavorazioni-capture-adapter.ts`
- `lib/document-capture/inventory-receiving-capture-adapter.ts`

## Shared shell components (required)

| Component | Path |
|-----------|------|
| Step indicator | `components/document-capture/gestionale-capture-step-indicator.tsx` |
| Upload zone | `components/document-capture/document-upload-zone.tsx` |
| Acquisition progress | `components/document-capture/capture-acquisition-progress-panel.tsx` |
| Review table | `components/document-capture/document-capture-review-table.tsx` |
| Review warnings / state | `components/document-capture/capture-review-warnings.tsx` |
| Analyze error + retry | `components/document-capture/capture-analyze-error-panel.tsx` |
| Entity matcher | `components/document-capture/entity-matcher.tsx` |
| Apply engine | `lib/document-capture/apply/capture-apply-engine.ts` |

## CaptureReviewState

```ts
type CaptureReviewState =
  | "ready"
  | "needs_review"
  | "blocked"
  | "partial_success"
  | "approved";
```

`partial_success` is critical for DDT (e.g. 8/10 lines recognized).

## UX contract (what may differ)

| Area | Lavorazioni | DDT |
|------|-------------|-----|
| Documento | Ordine/lavoro | DDT |
| Entità primaria | Mezzo | Articolo |
| Matching | Mezzo/cliente | Ricambio |
| Apply | lavorazione | carico magazzino |
| Audit entity | `work_order` | `inventory_movement` |

## Regression

- `lib/regression/ai-capture-parity.test.ts` — static import parity
- `lib/regression/document-capture-acquisition-ux.test.ts` — Lavorazioni UX lock
- `lib/regression/document-capture-capture-structure.test.ts` — DOM structure assertions

## Related

- [ADR-005](../adr/ADR-005-document-capture-single-apply-engine.md) — Lavorazioni apply engine
- [ADR-009](../adr/ADR-009-document-capture-unified-experience.md) — cross-domain experience
- [AI_DDT_VS_IMPORT_AI_DESIGN.md](../investigation/AI_DDT_VS_IMPORT_AI_DESIGN.md)
