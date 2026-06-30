# Fatturazione — estensioni future (v2+)

Documentazione di riferimento per evoluzioni pianificate fuori scope v1.

## Fatturazione elettronica / SDI

- Campi pronti su `billing_customers`: `codice_sdi`, `pec`, indirizzo JSONB.
- Snapshot immutabile su `invoices.customer_snapshot` per XML FatturaPA.
- Tab placeholder in `FatturazioneDetailDrawer` (sezione disabilitata).
- Integrazione: nuovo adapter `lib/fatturazione/fe-sdi/` + tab attiva nel drawer.

## Paginazione server-side

- Oggi: `fetchInvoiceListPayload` carica l’intera lista (OK fino ~5k record).
- Estensione: query paginata con filtri SQL + indice composito `(status, data_scadenza)`.
- UI: riusare `TablePagination` con `total` da API.

## Realtime

- Opzionale: subscription su `invoices` / `invoice_payments` via bridge gestionale esistente.
- Invalidazione query `useInvoicesQuery` su eventi INSERT/UPDATE.

## Prima nota / contabilità

- `invoice_payments` è già separata — base per incassi, insoluti, export contabile.
- Estensione: vista dedicata collegata a scadenze e KPI residuo.

## Multi-P.IVA / sedi

- Bridge `clienti_anagrafiche.entity_key` → `billing_customers.entity_key`.
- Sedi multiple in anagrafica clienti → selezione sede fiscale in wizard step 3.

## RPC correlate

| RPC | Uso |
|-----|-----|
| `create_invoice_with_rows_and_links` | Creazione atomica |
| `update_invoice_draft_with_rows` | Modifica bozza con replace righe/links |
| `register_invoice_payment` | Pagamenti + ricalcolo stato |
| `cancel_invoice` | Annullamento (admin) |
| `assert_invoice_preventivo_allocations` | Guard anti-overbilling |
