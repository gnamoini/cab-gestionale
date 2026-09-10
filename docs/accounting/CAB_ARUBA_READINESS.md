# CAB Aruba API Readiness

**Status:** **PRE-ARUBA CORE READY** — **NOT ARUBA API READY**  
**Date:** 2026-09-10 (target verified)

**TARGET DEPLOYMENT = VERIFIED**

---

## Preconditions (must be green before Aruba)

| # | Precondition | Current |
|---|--------------|---------|
| 1 | FASE 3–10 migrations applied in order | **PASS** — target `20270312120000` |
| 2 | P0-SEC-01 fixed (`fiscal_validity` trigger) | **PASS** on target |
| 3 | P1-SEC-01 fixed (`apply_sdi_event` restricted) | **PASS** on target |
| 4 | `npm run ci:tsc` PASS | **PASS** |
| 5 | `npm run test:fase10` PASS | **PASS** |
| 6 | Security remediation gate PASS | **PASS** |
| 7 | FASE 2 fiscal spec signed OR explicit CAB decision log | **OPEN (DRAFT)** |
| 8 | Aruba commercial contract + API documentation | **UNKNOWN** |
| 9 | Linux production build verified | **UNKNOWN** (win32 fails libxmljs2) |
| 10 | Controlled prod E2E draft→XML (no SdI) | **NOT RUN** |

---

## API Boundary Architecture

```text
┌─────────────────────────────────────────────────────────┐
│ CAB DOMAIN (must not import Aruba types)                │
│  invoice_snapshot → canonical → XML string + hash       │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ TRANSMISSION JOB (FASE 9)                               │
│  invoice_transmissions | invoice_sdi_jobs               │
│  correlation_key | idempotency_key                      │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ ADAPTER (FASE 11 — fe-sdi)                              │
│  ElectronicInvoicingProvider interface                  │
│  ├── SimulatorProvider (dev/test)                       │
│  └── ArubaElectronicInvoicingProvider (production)      │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ ARUBA API (external)                                    │
│  upload | status | notifications polling                │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
                         SdI → apply_sdi_event → fiscal_validity
```

**Rule:** Core CAB never branches on Aruba response shape outside adapter + `sdi-event-parser`.

---

## Adapter Contract

**Interface:** `lib/fatturazione/fe-sdi/electronic-invoicing-provider.ts`

| Method | Responsibility |
|--------|----------------|
| `submitInvoice(input)` | Upload XML; idempotent on correlation |
| `findSubmissionByCorrelation(key)` | Reconciliation after timeout |
| `pollNotifications(since)` | Primary mode — no webhook assumption |

**Input (`EinvoiceSubmitInput`):**

- `xml` — from `invoice_xml_documents` (immutable)
- `correlationKey` — stable per invoice+attempt
- `idempotencyKey` — retry-safe
- `filename` — FatturaPA naming convention

**Output mapping:** `sdi-event-parser.ts` → canonical event → `apply_sdi_event`

---

## Required Credentials / Config

| Env var | Purpose | Storage |
|---------|---------|---------|
| `ARUBA_FE_BASE_URL` | WS endpoint | Vercel env / secrets |
| `ARUBA_FE_USERNAME` | Basic auth | **Never DB plaintext** |
| `ARUBA_FE_PASSWORD` | Basic auth | **Never DB plaintext** |
| `CRON_SECRET` | SDI job processor | Server only |
| `SDI_WEBHOOK_SECRET` | Optional webhook | Server only |

**Current state:** `aruba-provider.server.ts` uses placeholder paths (`/services/invoice/out/upload`) — **must be verified against CAB-Aruba contract before LIVE**.

---

## Transmission State Machine

### CAB axes (unchanged by Aruba names)

| Axis | Writer |
|------|--------|
| `document_status` | `invoice_apply_transition` |
| `fiscal_validity` | **`apply_sdi_event` only** (intended) |
| `sdi_status` | `apply_sdi_event` |
| `accounting_status` | emit/posting RPCs |

### Transport (`invoice_transmissions`)

```text
queued → processing → provider_accepted | provider_error
                   → pending_reconciliation (timeout)
                   → failed | synced
```

### SdI events → fiscal

| Event | fiscal_validity |
|-------|-----------------|
| RC (consegna) | validly_issued |
| MC | validly_issued (equivalent) |
| NS (scarto) | not_validly_issued |
| provider_accepted | **unchanged** (pending) |

---

## Webhook Strategy

**Primary:** polling via cron (`fatturazione-sdi-processor`)  
**Secondary:** `app/api/fatturazione/sdi-webhook/route.ts` — secret-gated, delegates to `apply_sdi_event` via service_role

**Requirements before LIVE:**

1. Restrict `apply_sdi_event` to service_role + sdi_admin
2. Strong idempotency key from provider `notification_id`
3. Out-of-order event handling documented in `sdi-event-applier.server.ts`

---

## Retry / Reconciliation

Pattern: **local transaction + durable outbox + idempotency + reconciliation**

| Failure | Behavior |
|---------|----------|
| Timeout after upload | `pending_reconciliation` + poll by correlation |
| HTTP 500 | Job retry with backoff (cron) |
| Duplicate response | Idempotency key → no double transmission row |
| Worker crash after upload | Reconciliation poll finds remote state |
| Webhook duplicate | Dedup by notification_id (P3 gap today) |

**Anti-pattern (not used):** save DB → call Aruba → hope (emit TX commits job before external call)

---

## Failure Handling

| Scenario | CAB response |
|----------|--------------|
| XML invalid | Block at `generate-xml` route; no job enqueue |
| Provider reject | `provider_error` + retry policy |
| SdI NS | `not_validly_issued`; correction flow (same numero, new XML version) |
| Partial DB rollback | Job remains queued; idempotent retry |

---

## Security Requirements

1. Aruba credentials server-only (`import "server-only"`)
2. No XML PII in application logs (hash + id only)
3. `store_invoice_xml_document` — SERVER_ONLY RPC
4. Client cannot set `sdi_status`, `fiscal_validity`, transmission state
5. Service role limited to cron/webhook routes

---

## What Aruba Does / Does Not Do

| Aruba | CAB |
|-------|-----|
| Transmit XML to SdI | Build correct XML |
| Return SdI esiti | Apply esiti to state machine |
| Optional conservazione (contract) | Store XML blob + hash |
| Provider SLA | Fiscal correctness |

---

## Go-Live Checklist

```
□ Deploy FASE 3–10 migrations
□ Fix P0 fiscal_validity trigger
□ Restrict apply_sdi_event
□ Verify Aruba WS paths against contract
□ Set ARUBA_FE_* in production (no simulator fallback)
□ End-to-end test: TD01 emit → XML → submit → RC → validly_issued
□ End-to-end test: NS → correction → retransmit
□ Monitor: correlation_id in all logs
□ Document conservazione responsibility (LTA external)
```

**Verdict:** Adapter boundary exists; **NOT ARUBA API READY** until security + deploy + contract verification complete.
