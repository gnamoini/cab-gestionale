# ADR-009: Document Capture Unified Experience

**Status:** Accepted  
**Date:** 2026-07-18  
**Related:** [ADR-005](./ADR-005-document-capture-single-apply-engine.md), [DOCUMENT_CAPTURE_EXPERIENCE_CONTRACT](../design/DOCUMENT_CAPTURE_EXPERIENCE_CONTRACT.md)

## Context

AI Lavorazioni and AI DDT had diverging UX: duplicate step indicators, different progress UI, plain HTML review tables, duplicated apply handlers, and inconsistent CTAs. ADR-005 covers Lavorazioni persistence only; cross-domain **experience** needed a separate decision.

## Decision

1. **Experience Contract** — `docs/design/DOCUMENT_CAPTURE_EXPERIENCE_CONTRACT.md` governs all AI capture flows.
2. **Adapter pattern** — `CaptureExperienceAdapter` per domain; launchers must declare one.
3. **Shared shell** — `GestionaleCaptureStepIndicator` (`steps={adapter.steps}`), `DocumentUploadZone`, `CaptureAcquisitionProgress`, `DocumentCaptureReviewTable`, `CaptureAnalyzeErrorPanel`, CTA **"Conferma importazione"**.
4. **Review states** — `CaptureReviewState` including `partial_success`.
5. **Apply pattern** — `capture-apply-engine.ts` with domain adapters; DDT uses `inventory-receiving-apply-adapter`, Lavorazioni stays on ADR-005 `capture-apply.server.ts`.

## Non-decisions

- No merge of `document_capture` ↔ `inventory_documents` tables
- No shared DB API between domains
- Lavorazioni compile step (`CaptureSchedaCompileStep`) remains domain-specific inside review shell

## Consequences

### Positive

- Verifiable parity via `ai-capture-parity.test.ts`
- Future domains (Preventivi, Fatture) add adapter only
- DDT partial-success UX unified

### Negative

- Adapter interface must stay lean (ponytail)
- Two apply backends remain (by design)

## Audit events

Shared vocabulary in `lib/document-capture/capture-audit-events.ts`:

| Event | Lavorazioni entity | DDT entity |
|-------|-------------------|------------|
| `AI_STARTED` | `work_order` | `inventory_movement` |
| `IMPORT_CONFIRMED` | `work_order` | `inventory_movement` |
| `IMPORT_APPLIED` | `work_order` | `inventory_movement` |
