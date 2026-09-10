# FASE 8 STATUS REPORT

```
FASE 8 STATUS: PASS (pending deploy migration apply + CI)
```

## SCOPE

Ciclo attivo nativo CAB su `invoices` esistenti. Nessuna tabella `fatture` / `note_credito`. UnoERP assente. Un solo motore: FASI 3–7 collegate in transazione di emit.

## DATABASE

- **migrations:** `20270212120000_fase8_fatturazione_ciclo_attivo_schema.sql`, `20270212120100_fase8_fatturazione_ciclo_attivo_rpc.sql`
- **cedente:** `company_fiscal_profile` (obbligatorio su FINALIZE/EMIT; bozza OK senza)
- **assi:** `fiscal_validity` (`not_applicable|pending|validly_issued|not_validly_issued`), `fattura_pa_tipo_documento` TD01/04/05/24/25, `invoice_snapshot` immutabile post-emit
- **allocation:** `invoice_links` unique + `source_row_id`; remaining ignora `not_validly_issued`
- **jobs:** `invoice_sdi_jobs`; snapshot FatturaPA versionati append-only (`correction_of`); webhook receipts idempotenti su `notification_id`
- **storico:** `legacy_origin = LEGACY_IMPORTED` su fatture già numerate senza snapshot (nessuna riscrittura silenziosa)
- **nota debito:** `document_type` + `allocate_document_number('nota_debito')` → ND

## EMIT (transazione)

1. `company_fiscal_profile` valido
2. periodo OPEN
3. VAT validate + consolidate
4. `allocate_document_number`
5. freeze `invoice_snapshot`
6. payment_terms → `customer_open_items`
7. `accounting_create_entry` + `post` (`invoice-emit:{id}:tx:{n}`)
8. enqueue job SdI

Retry post-scarto: stesso numero/snapshot; `invoice_create_payment_schedule` ricrea partite; re-post `tx:{n+1}`.

## SDI_REJECTED (P0)

- `fiscal_validity = not_validly_issued`, `sdi_status = scartata`, `document_status` resta `emessa`
- `accounting_reverse_entry` (non NC)
- partite/receivables `cancelled`, residual 0
- eventi `invoice_sdi_rejected` + `accounting_reversed` + `open_items_neutralized`
- retry stesso numero; XML version N+1; re-post `tx:{n+1}` dopo reverse

## XML / PROVIDER

- Builder: `lib/fatturazione/fe-sdi/fatturapa-xml.server.ts` da snapshot di emissione (+ overlay telematico)
- Destinatario: codice 7 char **oppure** `0000000` + PEC
- `ElectronicInvoicingProvider.findSubmissionByCorrelation` obbligatorio prima di retry
- Simulator DEMO (valid/reject/delivered/delivery_failed/timeout/429/500 + correlate)
- Aruba adapter secrets-gated (`ARUBA_FE_*`, no `NEXT_PUBLIC_*`)
- Cron: `/api/cron/fatturazione-sdi-processor` ogni 5 minuti (service_role bypass su handler esiti)
- Webhook: `/api/fatturazione/sdi-webhook` autenticato → receipts unique → `handle_sdi_outcome`

## UI

- Tab **Da fatturare** (`v_ciclo_attivo_da_fatturare`)
- Wizard: niente “Stato iniziale = Emessa”; Crea bozza / Emetti; preventivi solo accettati; DDT prezzato da preventivo
- Drawer: validità fiscale, SdI, TD, origine; NC/ND solo `validly_issued`; incasso solo valido
- PDF da `invoice_snapshot` (watermark bozza; titolo NC/ND)
- Impostazioni: profilo fiscale cedente
- KPI fatturato: solo `validly_issued`
- Notifiche SdI: `trg_invoices_outbox` enqueue `fatturazione.sdi_rejected|sdi_delivered|sdi_delivery_failed` (no paid/overdue su `not_validly_issued`)

## GATES

- no UnoERP, no MAX(numero)+1, no `?? 22` in ciclo attivo
- no insert TS su `accounting_entries`
- RPC in `docs/security/rpc-access-manifest.json` (REVOKE anon)

## RESIDUI / P1

- Aruba LIVE e dati cedente reali
- Conservazione a norma
- Apply migration su ambiente (schema FASE 8 non ancora deployato)
