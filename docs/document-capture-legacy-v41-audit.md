# Document Capture — audit gap legacy vs v4.1

**Data audit:** 2026-07-10 · **Sprint 0 deliverable**

## Scope

Confronto pipeline `DOCUMENT_CAPTURE_V41=0` (legacy) vs v4.1 (orchestrator + validation engine).

## Coverage matrix

| Area | Legacy | v4.1 | Gap |
|------|--------|------|-----|
| Prompt contract versionato | Inline flat map | `prompt-contract.ts` | Drift prompt, retry policy non letta |
| Validation engine | Heuristiche inline | `validation-engine` + blocked fields | Review insufficiente su edge case |
| Dry-run DB | No | Sì | Rischio apply senza preview DB |
| Apply saga / resume | Parziale | `capture-apply` + resume | Recovery incompleta legacy |
| Audit events | Base | Append-only per fase | Idempotency fase |
| Token tracking | Parziale | `document_capture_attempts` | Cost monitoring |
| Telemetry import-core | No | `traceDocumentCapturePipelinePath` | Baseline legacy counter |

## Edge case noti (legacy)

- Campi multi-riga aggregati senza normalizzazione v4.1
- Retry backoff non allineato al contract (`retryPolicy` ignorato)
- Stati `review` vs `review_required` meno granulari

## Telemetria Sprint 0

- `traceDocumentCapturePipelinePath()` logga path `legacy` con counter in-memory
- Warning operativo: `import.document_capture.legacy_path`

## Switch definitivo (Sprint 3)

- Default v4.1: `DOCUMENT_CAPTURE_V41 !== "0"`
- Rollback: `DOCUMENT_CAPTURE_V41=0` + `NEXT_PUBLIC_DOCUMENT_CAPTURE_V41=0`
- Soak: monitorare `legacyPathUseCount` prima di rimuovere codice legacy

## Azioni post-switch

1. Rimuovere `analyze-capture.server.ts` legacy path
2. Unificare telemetry su `import_audit_events` (bridge opzionale)
3. Golden file regression su v4.1 only
