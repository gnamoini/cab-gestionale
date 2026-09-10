# CAB Invoice Engine — Audit FASE 0 (FASE 9)

**Data:** 2026-09-10  
**Scope:** read-only inventory pre-implementazione FASE 9  
**Base:** FASE 8 ciclo attivo nativo su `invoices`

---

## Executive summary

Il motore fattura CAB è già strutturato su FASE 8 con emit transazionale, snapshot immutabile, SDI jobs e assi multi-dimensionali. FASE 9 evolve verso production-ready aggiungendo: blob XML versionato, transmission model, event sourcing SdI, transport layer separato, XSD gate, Aruba WS reale.

**Zero UnoERP** in `lib/fatturazione/`, `app/api/fatturazione/`, `components/fatturazione/`.

---

## Database inventory

| Tabella | Scopo | FASE 9 |
|---|---|---|
| `invoices` | SSOT fattura, assi multi-dimensionali | MODIFY — `xml_schema_version` |
| `invoice_rows` | Righe documento + VAT snapshot | KEEP |
| `invoice_links` | Allocazione fonti (preventivo/consuntivo/ddt) | KEEP |
| `invoice_events` | Event log dominio | KEEP |
| `invoice_fatturapa_snapshots` | Metadata FatturaPA versionati | MODIFY — `xml_document_id` FK |
| `invoice_sdi_jobs` | Coda outbox invio SdI | MODIFY — `transmission_id`, `PENDING_RECONCILIATION` |
| `invoice_sdi_webhook_receipts` | Idempotenza webhook | KEEP |
| `invoice_sdi_submissions` | **Legacy phase 2 stub** | REMOVE writes → compatibility view |
| `company_fiscal_profile` | Cedente SSOT | KEEP |
| `document_number_sequences` | Numerazione FASE 6 | KEEP |
| `vat_codes` / `vat_code_configurations` | VAT Engine FASE 7 | KEEP |
| `accounting_entries` | Contabilità FASE 3 | KEEP |
| `customer_open_items` | Partite cliente | KEEP |

### Nuove tabelle FASE 9

- `invoice_xml_schema_versions`
- `invoice_xml_documents`
- `invoice_transmissions`
- `invoice_sdi_events`
- `invoice_state_history`

---

## Codice inventory

| File | Ruolo | FASE 9 |
|---|---|---|
| `lib/fatturazione/invoice-status.ts` | Lettura assi SSOT | MODIFY — fiscal authority gate |
| `lib/fatturazione/invoice-apply-transition.ts` | Client RPC emit | KEEP |
| `lib/fatturazione/fe-sdi/fatturapa-xml.server.ts` | XML builder minimo | MODIFY — refactor moduli |
| `lib/fatturazione/fe-sdi/sdi-job-processor.server.ts` | Job worker | MODIFY — transmission layer |
| `lib/fatturazione/fe-sdi/aruba-provider.server.ts` | Placeholder REST | MODIFY — Aruba WS reale |
| `lib/fatturazione/fe-sdi/simulator-provider.ts` | Test provider | KEEP |
| `lib/fatturazione/ciclo-attivo/create-invoice-from-sources.server.ts` | Server writer | MODIFY — wire API |
| `lib/fatturazione/fatturazione-workflow-permissions.ts` | RBAC stub | MODIFY — permessi granulari |
| `app/api/fatturazione/sdi-webhook/route.ts` | Webhook | MODIFY — `apply_sdi_event` |
| `app/api/cron/fatturazione-sdi-processor/route.ts` | Cron jobs | MODIFY — reconciliation |
| `components/fatturazione/fatturazione-fatture-section.tsx` | Lista fatture | MODIFY — filtri stato |
| `components/fatturazione/fatturazione-detail-drawer.tsx` | Dettaglio | MODIFY — XML/SdI/timeline |

---

## UI inventory

| Componente | Stato attuale |
|---|---|
| Tab Da fatturare | Operativo (FASE 8) |
| Wizard creazione | Client-side draft + emit |
| Drawer dettaglio | Fiscal validity, SdI read-only |
| Sezione SdI | Lista status, no retry UI |
| Sezione contabilità | Periodi/entries |
| Sezione impostazioni | `company_fiscal_profile` |

---

## Integrazioni

| Integrazione | Stato | Note |
|---|---|---|
| UnoERP | **REMOVED** | Solo migration history |
| Aruba FE | Skeleton REST | Da rifare con WS reale |
| Simulator | Default transport | Test/regression |
| SDI webhook | Route esistente | Non assumere come modalità Aruba primaria |
| Cron SDI | Ogni 5 min | Claim + process jobs |

---

## `invoice_sdi_submissions` zero-write verification

| Check | Risultato |
|---|---|
| Application writes (TS/TSX) | **ZERO** — solo RBAC parity test |
| DB trigger writes | **ZERO** |
| Cron/job writes | **ZERO** — usa `invoice_sdi_jobs` |
| Report/query writes | **ZERO** |

**Azione FASE 9:** REVOKE INSERT/UPDATE + compatibility view `v_invoice_sdi_submissions_legacy`.

---

## Bug FASE 8 identificato

`handle_sdi_outcome('ACCEPTED')` imposta `sdi_status=accettata` e `fiscal_validity=validly_issued`.  
**Violazione:** provider_accepted ≠ esito SdI.  
**Fix FASE 9:** solo `apply_sdi_event` con evento SdI canonicalizzato modifica `fiscal_validity`.

---

## Matrice KEEP / MODIFY / REMOVE

| AREA | OGGETTO | TABELLA/FILE | CURRENT BEHAVIOR | TARGET | AZIONE | RISCHIO |
|---|---|---|---|---|---|---|
| DB | Invoice hub | `invoices` | Multi-axis lifecycle | + xml_schema_version | MODIFY | Basso |
| DB | SDI jobs | `invoice_sdi_jobs` | Outbox PENDING→SYNCED | + transmission_id, reconciliation | MODIFY | Medio |
| DB | Legacy submissions | `invoice_sdi_submissions` | Phase 2 stub, no writes | Read-only view | REMOVE writes | Basso |
| DB | XML storage | — | Solo hash in snapshots | `invoice_xml_documents` blob | ADD | Basso |
| DB | Transmission | — | Implicit in jobs | `invoice_transmissions` | ADD | Medio |
| DB | SDI events | `invoice_events` (sdi cat) | Generic events | `invoice_sdi_events` append-only | ADD | Medio |
| Code | XML engine | `fatturapa-xml.server.ts` | Minimal FPR12 | Full + XSD gate | MODIFY | Alto |
| Code | SDI processor | `sdi-job-processor.server.ts` | Direct handle_sdi_outcome | Transmission + apply_sdi_event | MODIFY | Alto |
| Code | Aruba | `aruba-provider.server.ts` | Generic REST placeholder | WS reale documentato | MODIFY | Alto |
| Code | ACCEPTED bug | `handle_sdi_outcome` | ACCEPTED→validly_issued | Rimosso | MODIFY | Alto |
| Code | RBAC | `fatturazione-workflow-permissions.ts` | canWrite stub | Granular permissions | MODIFY | Medio |
| UI | Lista fatture | `fatturazione-fatture-section.tsx` | Basic filters | Composite state filters | MODIFY | Basso |
| UI | Dettaglio | `fatturazione-detail-drawer.tsx` | Basic SdI | XML/timeline/correction | MODIFY | Medio |
| Integrazione | UnoERP | `lib/integrations/unoerp/*` | Deleted | Assente | KEEP removed | — |
| Integrazione | Webhook | `sdi-webhook/route.ts` | handle_sdi_outcome direct | apply_sdi_event | MODIFY | Medio |

---

## Assi distinti (regola architetturale)

```text
document_status   → stato documentale CAB (bozza → emessa)
fiscal_validity   → autorità fiscale (KPI, incassi, NC)
sdi_status        → flusso SdI (solo apply_sdi_event)
transport_status  → canale provider (invoice_transmissions)
```

```text
SDI_SCARTATA ≠ fattura fiscalmente emessa
fiscal_validity = unica fonte per effetti fiscali
```
