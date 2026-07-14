# Fatturazione — matrice transizioni dominio (SSOT)

Documentazione ufficiale: **evento → assi di stato → chi → perché → open_items**.

Assi attivi su `invoices`:

- `document_status`: bozza | da_verificare | approvata | emessa | annullata
- `payment_status`: non_pagata | parzialmente_pagata | pagata | scaduta
- `sdi_status`: non_applicabile | da_generare | generata | inviata | consegnata | scartata | rifiutata
- `accounting_status` (Fase 3): non_rilevante | da_registrare | registrata | …

**Credito cliente** non è `payment_status`: vive in `customer_open_items` (`amount_signed` positivo).

## Convenzione segno `customer_open_items`

```
positivo (+) = credito cliente verso azienda
negativo (-) = debito cliente verso azienda

Fattura vendita 1.000 €  → amount_signed = -1000
Nota credito 200 €      → amount_signed = +200
Anticipo cliente 500 €  → amount_signed = -500
```

## Matrice transizioni

| Transizione RPC | document_status | payment_status | sdi_status | Altro | open_items | Chi (RBAC) |
|-----------------|-----------------|----------------|------------|-------|------------|------------|
| `create_draft` | bozza | non_pagata | non_applicabile | — | — | write |
| `submit_for_review` | da_verificare | — | — | evento | — | write |
| `approve` | approvata | — | — | approved_at | — | write |
| `emit` | emessa | non_pagata | da_generare | — | crea partita `-totale` | write |
| `mark_sent_to_customer` | — | — | — | sent_to_customer_at | — | write |
| `register_payment_partial` | — | parzialmente_pagata | — | — | aggiorna remaining | write |
| `register_payment_full` | — | pagata | — | — | chiude partita | write |
| `mark_overdue` | — | scaduta | — | — | — | sistema/cron |
| `payment_excess` | — | pagata (fattura) | — | — | **nuova** partita credito `+eccedenza` | write |
| `cancel` | annullata | — | — | annullata_at | chiude partita | write |
| `credit_note_emit` (NC) | emessa (NC) | — | da_generare | document_type=nota_credito | partita `+importo` | write |
| `sdi_generate` | — | — | generata | snapshot | — | write |
| `sdi_send` | — | — | inviata | submission | — | write + sdi_send |
| `sdi_delivered` | — | — | consegnata | evento SDI | — | adapter |

## Legacy `status` mapping (backfill)

| status legacy | document_status | payment_status | note |
|---------------|-----------------|----------------|------|
| bozza | bozza | non_pagata | |
| da_verificare | da_verificare | non_pagata | |
| emessa | emessa | non_pagata | |
| inviata | emessa | non_pagata | + sent_to_customer_at |
| parzialmente_pagata | emessa | parzialmente_pagata | |
| pagata | emessa | pagata | |
| scaduta | emessa | scaduta | |
| annullata | annullata | non_pagata | |

## Catena eventi (correlation_id)

Esempio incasso con allocazione:

```
payment_imported → payment_created → payment_allocated → invoice_status_changed → open_item_updated
```

Tutti gli eventi condividono `correlation_id`; `causation_id` punta all'evento precedente.

## Matrice eventi (implementazione)

| Azione | event_type | correlation | SSOT insert |
|--------|------------|-------------|-------------|
| Creazione bozza | `draft_created` | nuovo | `create_invoice_with_rows_and_links` |
| Transizione dominio | `status_changed` | nuovo | `invoice_write_status_axes` |
| Invio cliente | `customer_sent` | nuovo | `invoice_apply_transition` |
| Pagamento | `payment_registered` | catena | `register_invoice_payment` |
| Allocazione | `payment_allocated` | stesso | `register_invoice_payment` |
| NC | `credit_note_created` | nuovo | `create_credit_note_from_invoice` |
| Export CSV | `export` | nuovo | `appendBillingEvent` (TS) |
| SDI | `sdi_*` | nuovo | Fase 2+ |

INSERT su `invoice_events`: solo `invoice_insert_event()` (SQL) e `append_billing_event` / `appendBillingEvent` (TS).

## RBAC pagina Fatturazione (page SSOT)

**Contratto:** WRITE sulla pagina `fatturazione` abilita tutte le operazioni disponibili nella pagina, salvo vincoli fiscali espliciti o capability separate future.

| Layer | Verifica |
|-------|----------|
| Route / UI | `canWritePage(resolved, 'fatturazione')` |
| Client mutation | `withPageWriteGuard('fatturazione')` → `ensurePageWrite` |
| DB RLS / RPC | `rbac_module_can('fatturazione', 'write')` → page SSOT |

**Vincoli non-RBAC (fiscali / integrità):**
- Annulla nascosto in UI se `status = pagata` → usare nota di credito
- Modifica dati solo su bozze (`bozza`, `da_verificare`)
- Delete pagamento su fatture emesse: bloccato (RLS condizionale su stato fattura padre)

**Whitelist `admin` (manutenzione, non UX pagina):** `apply_invoice_status_backfill`, backfill assi, report migrazione.

Migration allineamento: `20260915120200_fatturazione_write_rls_alignment.sql`.
