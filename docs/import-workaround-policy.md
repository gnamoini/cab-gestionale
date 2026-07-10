# Import — policy anti-workaround

## Regola

Nessun nuovo flusso import AI fuori da:

- `lib/import-core/` (correlation, executions, audit, validator)
- `lib/import-files/` (upload SSOT)
- `lib/ai/extraction/ai-extraction-service.ts` (Gemini wrapper)
- adapter di dominio esistenti (document-capture, ordini, listino, data-import)

## Vietato in PR

- Nuove tabelle job (`import_jobs`, `document_imports`, …) senza ADR
- Chiamate Gemini dirette (`process.env.GEMINI_*`) fuori da `gemini-client.ts`
- Timeout AI hardcoded diversi da `GEMINI_FILE_ANALYSIS_TIMEOUT_MS`
- Stati business su `import_files` (usare `import_executions`)
- Correlation ID custom (`batchId` client-only come unico ID operativo)

## Eccezioni

Documentati in PR con:

1. Motivo business
2. Piano convergenza verso import-core
3. Review architetto

## Review checklist

- [ ] `correlation_id` UUIDv7 propagato
- [ ] Error code da `IMPORT_ERROR_CATALOG`
- [ ] Permessi RBAC verificati (UI + route + dati)
- [ ] Nessun secret in client
