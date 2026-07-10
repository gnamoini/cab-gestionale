# Import Core Contract (golden freeze)

**Versione:** 1.0 · **Gate:** Sprint 1.5 — obbligatorio prima migrations Sprint 2+

Contratto congelato per `import_files`, `import_executions`, `import_audit_events`, AI layer e commit.

---

## 1. Correlation ID

| Layer | Formato | Note |
|-------|---------|------|
| DB / API / log | `uuid` UUIDv7 | `correlation_id` su executions, audit, `import_files.meta` |
| UI / supporto | `IMP-YYYYMMDD-XXXXX` | `formatImportCorrelationDisplay()` — mai PK |

Header HTTP: `X-Correlation-Id` (opzionale in request; sempre in response).

Implementazione: `lib/import-core/correlation-id.ts`

---

## 2. Stati `import_files` (solo file lifecycle)

```
uploaded → stored → quarantined | expired | deleted
```

Legacy (transizione): `processing`, `processed`, `failed`, `cancelled` — mappati via RPC, non stati business.

| Stato | Significato |
|-------|-------------|
| `uploaded` | Registrato, bytes non ancora finalizzati |
| `stored` | Bytes in storage, pronto per execution |
| `quarantined` | File sospetto / bloccato (no processing) |
| `expired` | TTL scaduto |
| `deleted` | Rimosso logicamente |

---

## 3. Stati `import_executions` (processing lifecycle)

```
queued → processing → ai_processing → needs_review | ready_to_commit
  → committing → completed | failed | cancelled
```

| Stato | Significato |
|-------|-------------|
| `needs_review` | AI ok ma BusinessValidator warning/blocking |
| `ready_to_commit` | Pronto per commit utente |
| `failed` | Errore tecnico (`error_code` da catalogo) |

Gerarchia fasi: `parent_execution_id` (no `import_jobs`).

Retry DB: `max_attempts`, `retry_count`, `next_retry_at`.

Anti-stuck: `heartbeat_at`, `worker_id`, threshold 10 min → `EXECUTION_STUCK`.

---

## 4. `import_audit_events`

| Campo | Tipo | Note |
|-------|------|------|
| `event_type` | text | Es. `AI_STARTED`, `FAILED`, `EXECUTION_STUCK_RECOVERED` |
| `severity` | info \| warning \| error \| critical | |
| `correlation_id` | uuid | |
| `payload` | jsonb object | |

RLS: `company_id = rbac_user_company_id()`.

---

## 5. Import Error Catalog

SSOT: `lib/import-core/import-error-catalog.ts`

Ogni errore API / execution / audit usa un code catalogato con:

- `retryable: boolean`
- `severity`
- `userMessage` (IT, UI)
- `technicalMessage` (log)

---

## 6. Ownership

| Risorsa | Regola |
|---------|--------|
| `import_files.company_id` | Tenant obbligatorio |
| `import_files.uploaded_by` | Owner upload; altri con module write |
| `import_executions` | Scoped `company_id` |
| Worker cron | Service role; claim only; process con sessione utente |

---

## 7. `AIExtractionService`

Path: `lib/ai/extraction/ai-extraction-service.ts`

Obbligatori: `executionId`, `correlationId`, `companyId`.

Aggiorna: `import_executions` (provider, model, tokens, duration) + `import_audit_events`.

Provider attuale: `google_gemini` / `gemini-2.5-flash`.

Timeout: `GEMINI_FILE_ANALYSIS_TIMEOUT_MS` (SSOT `gemini-client.ts`).

---

## 8. `BusinessValidator`

Path: `lib/import-core/business-validator.ts`

```typescript
type BusinessValidationResult = {
  status: "ok" | "needs_review" | "blocked";
  aiConfidence?: number;
  businessConfidence: number; // 0–1
  issues: ValidationIssue[];
};
```

Severity issue: `info` | `warning` | `blocking`.

`blocking` o `businessConfidence` sotto soglia → execution `needs_review`.

Validator per dominio: `business-validators/*`.

---

## 9. `ImportCommitAdapter`

Path: `lib/import-core/import-commit-adapter.ts`

```typescript
interface ImportCommitAdapter<TPayload> {
  canCommit(ctx, payload): Promise<boolean>;
  getIdempotencyKey(ctx, payload): string;  // obbligatorio
  commit(ctx, payload): Promise<CommitResult>;
  canCompensate(ctx, payload): Promise<boolean>;
  compensate(ctx, payload): Promise<void>;
}
```

Implementazioni: `commit-adapters/ordine-fornitore-commit-adapter.server.ts`, `listino-commit-adapter.server.ts`.

Compensation per dominio — no rollback generico cross-dominio.

---

## 10. API surface

| Route | Metodo | Scopo |
|-------|--------|-------|
| `/api/import/files/:id/run` | POST | Avvia execution (sync/async) |
| `/api/import/executions/:id` | GET/POST | Poll / process queued |
| `/api/import/executions/:id/retry` | POST | Retry failed |
| `/api/import/dashboard` | GET | Stats admin |
| `/api/cron/import-process-queue` | POST | Stuck recovery + claim |

---

## 11. Naming

- DB: `snake_case`
- TS types: `PascalCase` / `camelCase` mapped da row
- Feature keys: `ordine_fornitore`, `listino_pdf`, `listino_columns`, `document_capture`, …

---

## 12. Non obiettivi (YAGNI freeze)

- `import_jobs` table
- Redis/Bull queue
- Vercel Workflow (fase 2 opzionale)
- Multi-provider AI attivo
- Undo import generico

---

## Changelog

| Versione | Data | Note |
|----------|------|------|
| 1.0 | 2026-07-10 | Golden freeze Sprint 1.5 |
