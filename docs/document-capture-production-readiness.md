# Document Capture v3.3 — Production Readiness Report (Release)

Audit e hardening release completati. Architettura v3.3 **invariata**; estensioni additive `30800`–`31200`.

## Migration order (definitiva)

| Migration | Contenuto | Revertibile |
|-----------|-----------|-------------|
| `20260902130000` | Core schema + storage | No (base) |
| `20260902130100` | Permessi modulo | Parziale |
| `20260902130200` | Child RLS + GRANTs | No |
| `20260902130300` | handle_new_user Default (superseded da 31100) | — |
| `20260902130400` | REVOKE expire_* authenticated | Sì |
| `20260902130500` | Status transitions SQL | No |
| `20260902130600` | Phase 2 RPC mutate | No |
| `20260902130700` | Scheda PDF RLS | No |
| `20260902130800` | **Apply lock** — stato `applying`, begin/complete/abort RPC | No |
| `20260902130900` | **Rate limit Postgres** — bucket + RPC check | Sì (drop table) |
| `20260902131000` | **PDF renderer_hash** reali + CHECK opzionale | Sì (UPDATE) |
| `20260902131100` | **Signup tenant NULL** — profiles.company_id nullable | Parziale |
| `20260902131200` | **RLS/events audit** — attempts UPDATE deny, storage_uploaded, archived | Parziale |

**Ordine deploy:** applicare in sequenza numerica. Non saltare `30800` se si usa apply in produzione.

## Rollback procedure

1. **Disabilitare modulo UI** — revocare permesso `document_capture` via sicurezza (immediate, no schema).
2. **Rate limit (`30900`)** — `DROP FUNCTION document_capture_rate_limit_check; DROP TABLE document_capture_rate_limit_buckets;` — ripristina comportamento senza limit (non consigliato prod).
3. **Apply lock (`30800`)** — non revertibile senza downtime: stati `applying` richiedono `document_capture_abort_apply` prima di downgrade.
4. **Signup NULL (`31100`)** — non tornare a NOT NULL finché profili senza tenant esistono.

## Failure recovery

| Scenario | Recovery |
|----------|----------|
| Stuck `applying` | Admin: `document_capture_abort_apply(capture_id, reason)` → `failed`; UI resume |
| Apply parziale (`apply_partial`) | `POST /api/document-capture/[id]/resume` con `applicationId` del row failed |
| `PLAN_STALE` (409) | Riconfermare campi → nuovo dry-run → apply |
| `APPLY_IN_PROGRESS` (409) | Attendere o abort admin se timeout |
| Upload senza tenant | Admin assegna `profiles.company_id`; utente riprova |

## Monitoring

**Eventi da watch (alert/log):**

- `apply_failed`, `apply_partial` — spike = saga/integrazione
- `storage_uploaded` senza `finalized` — upload incompleto
- Rate limit 429 con `RATE_LIMITED`

**Telemetry error codes (`document-capture-error-codes.ts`):**

`UPLOAD_FAILED`, `PLAN_STALE`, `APPLY_FAILED`, `APPLY_IN_PROGRESS`, `UNAUTHORIZED`, `TENANT_MISSING`, `RATE_LIMITED`, `NOT_CONFIGURED`

Ogni trace mutante include: `captureId`, `companyId`, `userId`, `operation`, `durationMs`, `outcome`, `errorCode`.

## Componenti verificati

| Layer | Stato |
|-------|-------|
| Migrations `30000`–`31200` | In repo |
| Apply saga + lock + resume | `capture-apply.server.ts`, RPC `30800` |
| Rate limit Postgres | `30900`, route upload/analyze/dry-run/apply/resume |
| PDF hash runtime | `31000` + `scheda-blank-pdf.server.ts` |
| Tenant guard | `31100` + `requireCompanyIdForUser` su route write |
| RLS audit | `31200` + `document-capture-rls-audit.test.ts` |
| Events | `storage_uploaded`, `archived`, idempotent `fields_confirmed` |
| Tests | unit + regression in `smoke-regression-lists.ts` |
| E2E | `e2e/smoke/document-capture-production.spec.ts` |

## Checklist §11 (release)

- [x] Build + typecheck green (`npm run build`)
- [x] Apply lock `applying` + RPC FOR UPDATE (`30800`)
- [x] `resumeFailedCaptureApply` + route `/resume` + UI CTA
- [x] Rate limit Postgres condiviso (`30900`)
- [x] PDF `renderer_hash` allineato a runtime (`31000`)
- [x] Signup senza tenant Default; admin create setta `company_id`
- [x] RLS audit + cross-company deny patterns
- [x] Eventi audit completi + idempotency fields
- [x] Telemetry error codes su route mutanti
- [x] E2E smoke + cross-tenant (env opzionale)
- [x] Documentazione release (questo file)

## Rischi residui accettati

- **Saga non atomica DB** — mitigato da lock `applying`, resume, idempotency apply, eventi `apply_partial`
- **Rate limit Postgres** — latenza RPC extra vs in-memory; accettabile multi-instance
- **Utenti signup senza `company_id`** — non possono document capture finché admin assegna tenant (**by design**)
- **Analyze AI** — dipende da `GEMINI_KEY`; E2E skip-friendly se non configurato

## Evidenza test

```bash
npm run test:regression -- lib/document-capture/
npm run test:regression -- lib/regression/document-capture-
npm run build
# E2E (env smoke):
npx playwright test e2e/smoke/document-capture-production.spec.ts
```

---

*Report aggiornato a release v3.3 production-ready.*
