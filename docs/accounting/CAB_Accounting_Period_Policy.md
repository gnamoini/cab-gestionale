# CAB Accounting — Period Policy

**Date:** 2026-09-10

---

## Modello

```text
accounting_fiscal_years (esercizio annuale)
    └── accounting_periods (12 periodi mensili obbligatori, 1..12)

competence_date → accounting_resolve_period() → fiscal_year_id + period_id
```

Date bounds: `start_date` e `end_date` **inclusive** (`daterange(..., '[]')`).

---

## Stati periodo

| Stato | Posting ordinario | Modifica entry | Storno/rettifica |
|-------|-------------------|----------------|------------------|
| **OPEN** | Sì (nel periodo) | Solo draft | Sì |
| **CLOSED** | No | No | Sì, nel periodo OPEN di `p_reversal_date` |
| **LOCKED** | No | No | Sì, nel periodo OPEN di `p_reversal_date`; **non riapribile** |

`LOCKED` = blocco terminale operativo. Stesso blocco di `CLOSED` su entry; differenza: nessuna `reopen` applicativa.

Transizioni: `OPEN → CLOSED → LOCKED` (mai `OPEN → LOCKED` diretto).

---

## Storno e rettifica

**Principio:** mai UPDATE/DELETE dell'originale.

```text
ENTRY 100 (errata, periodo chiuso)
    ↓
ENTRY 101 — STORNO (p_reversal_date → periodo OPEN corrente)
    ↓
ENTRY 102 — RETTIFICA (adjustment_date → periodo OPEN corrente)
```

- `p_reversal_date` / `adjustment_date`: **obbligatori**, mai `current_date` implicito
- `reverses_entry_id` / `corrects_entry_id`: tracciabilità permanente
- Numerazione: nuovo `entry_number` nel `fiscal_year` del periodo di registrazione

---

## Chiusura esercizio

```text
Tutti i periodi 1..12: CLOSED o LOCKED
        ↓
accounting_close_fiscal_year
        ↓
Esercizio: OPEN → CLOSED
```

Se anche un solo periodo è `OPEN` → RPC fallisce. **Non** chiude implicitamente i periodi.

---

## Draft entry

Alla creazione: `fiscal_year_id` + `period_id` obbligatori (resolve da `competence_date`).

Cambio `competence_date` su draft → ri-risoluzione periodo + verifica OPEN.
