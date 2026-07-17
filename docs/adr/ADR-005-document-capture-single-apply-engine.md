# ADR-005: Single Apply Engine for Document Capture Lavorazioni

**Status:** Accepted  
**Date:** 2026-07-17  
**Deciders:** Engineering  
**Supersedes:** dual-path launcher create (partial)

---

## Context

Document Capture v4.1 provides a production-ready `dry-run → apply` pipeline (`capture-apply.server.ts`) with apply lock, idempotency, and audit events. The Lavorazioni UI (`LavorazioniDigitalCaptureLauncher`) bypassed this path and persisted via `useLavorazioneCreateSubmit` + `SchedeLavorazioneModal`, causing:

- Missing `document_capture.lavorazione_id` / committed status on the operator path
- No apply lock / resume on the primary flow
- Ephemeral discard after success (lost audit trail)
- Duplicate SHA256 handling as toast-only
- Ricambi saved as free text without magazzino link

## Decision

1. **Single Apply Engine** — all AI import persistence goes through `capture-apply.server.ts` → `intervento-write-saga`.
2. **Launcher = UI only** — upload, analyze, review, dry-run, apply API calls; no direct lavorazione mutations.
3. **Persistent saga** — `document_capture_apply_jobs` replaces volatile sessionStorage ledger for capture apply.
4. **Entity links** — `document_capture_links` records capture ↔ lavorazione/schede/mezzo/ricambi.
5. **Feature flag** — `DOCUMENT_CAPTURE_LAUNCHER_APPLY_V1` (default on); `=0` rolls back to legacy launcher path.

## Deprecated (AI import context only)

| Component | Replacement |
|-----------|-------------|
| `CaptureSchedaCompileStep` + `useLavorazioneCreateSubmit` | `CaptureSchedaCompileStep` `applyMode` + `useCaptureApplyFlow` |
| `onOpenSchedeFromCapture` + `bundleOverride` | Server-side apply with `lavorazione_id` on capture |
| `discardEphemeralCaptureClient` post-success | Commit + `document_capture_links`; optional soft-delete |

`useLavorazioneCreateSubmit` **remains** for manual lavorazione creation (non-AI).

## Pipeline contract

```
upload-policy → storage → finalize → analyze → review
  → PATCH fields (operator edits)
  → dry-run → validateCaptureForApply
  → apply → apply_jobs + links → committed
```

## Consequences

### Positive

- One persistence path; v4.1 guarantees apply to operators
- Resumable saga; admin recovery via apply_jobs
- Full audit trail capture → entities
- Ricambi ER enforced server-side before apply

### Negative

- Larger launcher refactor; feature flag required for safe rollout
- Ingresso form edits must sync to `document_capture_fields` before apply

## Rollback

Set `DOCUMENT_CAPTURE_LAUNCHER_APPLY_V1=0` and `NEXT_PUBLIC_DOCUMENT_CAPTURE_LAUNCHER_APPLY_V1=0`.
