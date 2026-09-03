# Consuntivo analysis

**Stato: BLOCKED** — nessun modulo consuntivo nativo leggibile.

## Ricerca esplicita (READ-ONLY)

| Module/File | `info` | Note |
|-------------|--------|------|
| Produzione/consuntivi | HTTP 500 | OBSERVED |
| Produzione/consuntivo | HTTP 500 | OBSERVED |
| Produzione/rendicontazione | HTTP 500 | OBSERVED |
| Produzione/attivita | HTTP 500 | OBSERVED |
| CRM/consuntivi | HTTP 500 | OBSERVED |
| Commesse/consuntivi | HTTP 404 | |

## Candidato parziale: Produzione/task

| Campo | Valore |
|-------|--------|
| Module/File | `Produzione/task` |
| PK | `id_task` |
| Cliente | `cliente_id` (livesearch) |
| Tabs | `attivita_tab`, `budget_tab`, `categoria_tab`, `stato_tab` |
| Campi lavoro | `lavorato`, `lavorato_da`, `lavorato_a`, `chiuso` (da sample index) |

**Classificazione representation:** **E — REQUIRES_VENDOR_CONFIRMATION**

- Non è un modulo "consuntivo" nominato
- Tab `attivita` non ispezionabile (`Produzione/attivita` → HTTP 500)
- Impossibile verificare struttura righe valorizzate

## REPRESENTATION_FEASIBILITY

**FAIL** — nessun modulo consuntivo 1:1 o mappabile con schema verificato.

## BILLING_WORKFLOW_FEASIBILITY

**FAIL** — impossibile verificare utilità amministrativo/fatturativo senza READ su consuntivi/attività/rendicontazione.

## Combinazione

```
REPRESENTATION_FEASIBILITY: FAIL
BILLING_WORKFLOW_FEASIBILITY: FAIL
```

## Regola integrazione

```
consuntivo = BLOCKED
```

Non blocca preventivi/DDT a livello architetturale, ma **Gate Consuntivo = BLOCKED**.

Non mappare consuntivo CAB su `Produzione/ordini` né su `preventivi` senza conferma UnoERP.
