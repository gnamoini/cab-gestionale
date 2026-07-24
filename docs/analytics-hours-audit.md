# Analytics ore — audit sorgenti

Principio SSOT:

| Tipo | Sorgente | Uso consentito |
|------|----------|----------------|
| **PRESENCE** | `dipendenti_timesheet_entries` | Cartellino, saturazione capacità |
| **ACTUAL** | `lavorazioni.actual_labor_hours` (+ JSONB scrittura) | Produttività, KPI officina, costo manodopera |
| **ESTIMATE** | `preventivi.dettagli.manodopera.oreTotali` | Preventivi, confronto stima/consuntivo € e ore |

## Moduli e campi

| Modulo | Tabella | Campo | hourKind | Chi modifica | KPI impattati |
|--------|---------|-------|----------|--------------|---------------|
| Dipendenti | `dipendenti_timesheet_entries` | `ore_ordinarie`, `ore_straordinarie` | presence | Utente modulo dipendenti | `presence_hours_total`, saturazione |
| Schede | `scheda_lavorazione.contenuto` | `oreImpiegate` | actual (scrittura) | Utente modulo lavorazioni | — (denorm su save) |
| Lavorazioni | `lavorazioni` | `actual_labor_hours` | actual (lettura analytics) | Save scheda server-side | `actual_labor_hours_total`, cross_efficiency |
| Preventivi | `preventivi.dettagli` | `manodopera.oreTotali` | estimated | Utente modulo preventivi | Solo confronto stima/consuntivo |
| Mapping | `addetti_employee_mapping` | `addetto_nome` → `employee_id` | identity | Conferma UI dipendenti | KPI per-dipendente |

## Flussi preventivo (nessuna contaminazione produttività)

1. **Creazione preventivo** → scrive solo `preventivi` + `log_modifiche`
2. **Generazione da schede** → one-time copy `oreImpiegate` → `manodopera.ore`, no write-back
3. **Modifica preventivo post-chiusura** → non altera `actual_labor_hours`
4. **Report produttività** → legge solo `actual_labor_hours`, mai `manodopera.oreTotali`

## Guard implementati

- `lib/analytics/hours/` — unico accesso analytics ore
- `lib/regression/hours-ssot-guard.test.ts` — regressioni + lint import
- Metric registry: `hourKind`, `sourceTables`, `allowEstimate`
- `hoursIntegrityCheck()` — mismatch colonna/JSONB, unmapped addetti
- Trigger safety net: `actual_labor_hours_source = safety_net_trigger`

## Widget diagnostico

Sezione Report **ANALISI ORE OFFICINA** → widget Qualità dati ore:

- % ore validate (consistency ok)
- Lavorazioni senza consuntivo
- Addetti senza mapping confermato

API: `GET /api/report/analisi-ore-officina`
