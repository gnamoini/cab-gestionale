# Report V2 — Priorità implementazione

> **Data:** 19 luglio 2026  
> **Fonti:** `docs/report-analytics-audit.md`, `docs/report-analytics-catalog.json`, `docs/report-v2-blueprint.md`

Legenda complessità: **Bassa** (1-3 giorni) · **Media** (1-2 settimane) · **Alta** (2-4 settimane) · **Molto alta** (>1 mese)

---

## P0 — Implementare subito

Elementi senza i quali la V2 non porta valore decisionale rispetto alla V1.

### P0.1 Ristrutturazione sezioni (6 macro-aree + ANALISI IA)

| Campo | Valore |
|-------|--------|
| **Valore business** | Allineamento UX a come l'officina ragiona; report AI dedicato per review settimanale/mensile |
| **Complessità** | Media |
| **Dipendenze** | `report-sections-config.ts`, `REPORT_SECTION_UI` |
| **Rischi** | Regressioni RBAC; bookmark URL utenti |

**Deliverable:** 6 sezioni accordion analitiche + sezione **ANALISI IA** mantenuta; rimozione solo di `grafici_kpi` come sezione standalone (widget trend embedded).

---

### P0.2 Eliminazione KPI duplicati

| Campo | Valore |
|-------|--------|
| **Valore business** | Riduce rumore, aumenta fiducia nei numeri |
| **Complessità** | Bassa |
| **Dipendenze** | `report-metric-registry.ts`, unified KPI grid |
| **Rischi** | Basso — rimuovere `lav_open`, `lav_completed`, `lav_avg_close`, `lav_clients`, `mag_critical`, `lav-saldo-periodo` hero |

**Metriche consolidate:** una sola istanza per `lav-aperti`, `lav-chiusi`, `lav-tempo`, `clienti`, `scorta`.

---

### P0.3 Executive KPI Row (6 card cross-sezione)

| Campo | Valore |
|-------|--------|
| **Valore business** | Decisione in 10 secondi per responsabile officina e direzione |
| **Complessità** | Media |
| **Dipendenze** | `buildReportModel`, derived context da tutte le sezioni |
| **Rischi** | Cross-section incompleto se sezioni non prefetchate — **risolvere con prefetch automatico executive** |

**Card:** Chiusure · Aperte · Oltre SLA · Fatturato · Da incassare · Sotto scorta.

---

### P0.4 Aging backlog (sostituisce saldo periodo)

| Campo | Valore |
|-------|--------|
| **Valore business** | Identifica *dove* si accumula il ritardo, non solo se ingressi > chiusure |
| **Complessità** | Bassa |
| **Dipendenze** | `lav_aging_backlog` — dati già in memoria |
| **Rischi** | Nessuno — calcolo client puro |

**Metriche catalogo:** `lav_aging_backlog`.

---

### P0.5 Grafico ingressi vs chiusure

| Campo | Valore |
|-------|--------|
| **Valore business** | Visualizza il gap carico/smaltimento — domanda #1 officina |
| **Complessità** | Bassa |
| **Dipendenze** | `lav_andamento_mensile`, semantic index |
| **Rischi** | Allineare granularità con periodo selezionato |

---

### P0.6 KPI crediti: Da incassare + Scadute

| Campo | Valore |
|-------|--------|
| **Valore business** | Rischio cash immediato — oggi calcolati ma non sempre visibili |
| **Complessità** | Bassa |
| **Dipendenze** | `buildInvoicePeriodKpi` già esiste |
| **Rischi** | Nessuno |

**Metriche catalogo:** `eco_da_incassare`, `eco_scadute`.

---

### P0.7 Tabella Oltre SLA con drill-down

| Campo | Valore |
|-------|--------|
| **Valore business** | Azione operativa diretta su interventi in ritardo |
| **Complessità** | Bassa |
| **Dipendenze** | `lav_late_sla`, link a lista lavorazioni filtrata |
| **Rischi** | Permessi lavorazioni per drill-down |

---

### P0.8 Disponibilità flotta per cliente (ottimizzata)

| Campo | Valore |
|-------|--------|
| **Valore business** | SLA verso clienti — KPI già esistente ma lento |
| **Complessità** | Media-Alta |
| **Dipendenze** | `clienti_disponibilita` — oggi O(mezzi×lav) |
| **Rischi** | **Performance** — priorità ottimizzazione o RPC aggregata |

**Mitigazione P0:** indicizzare per `mezzo_id` + set di lav attive; target <200ms.

---

### P0.9 Cross analytics con prefetch obbligatorio

| Campo | Valore |
|-------|--------|
| **Valore business** | 4 KPI trasversali sono il cuore decisionale direzionale |
| **Complessità** | Media |
| **Dipendenze** | `buildCrossAnalytics`, prefetch labor+operational+warehouse+economic all'apertura pagina |
| **Rischi** | Oggi incompleto finché sezioni non espanse — **blocca UX V2** |

**Metriche:** `cross_efficiency`, `cross_parts_job`, `cross_cost_job`, `cross_value_hour`.

---

### P0.10 Insight Strip (regole deterministiche)

| Campo | Valore |
|-------|--------|
| **Valore business** | Anteprima immediata orientata azione; complemento leggero al report AI |
| **Complessità** | Media |
| **Dipendenze** | Formule Fase 9 audit, soglie configurabili |
| **Rischi** | Troppi alert → ignorati; max 5 messaggi con priorità |

**Nota:** non sostituisce ANALISI IA — link «Approfondisci con report AI» verso sezione dedicata.

---

### P0.11 Mantenimento sezione ANALISI IA (UX attuale)

| Campo | Valore |
|-------|--------|
| **Valore business** | Report narrativo completo settimanale/mensile per direzione — valore già percepito oggi |
| **Complessità** | Bassa (nessuna rimozione; solo non regressione in P0) |
| **Dipendenze** | `report-ai-section.tsx`, `POST /api/report/analysis`, cache fingerprint |
| **Rischi** | Rate limit Gemini; context incompleto se derived non prefetchato |

**Deliverable:** sezione `analisi_ai` invariata in P0; shortcut «Report settimana» / «Report mese» in P1.

---

### P0.12 Fix sparkline vs manual override

| Campo | Valore |
|-------|--------|
| **Valore business** | Coerenza dati — oggi KPI e sparkline divergono |
| **Complessità** | Bassa |
| **Dipendenze** | `semanticIndex.sparkSeries`, `report_manual_entries` |
| **Rischi** | Basso |

---

### P0.13 Ore per dipendente

| Campo | Valore |
|-------|--------|
| **Valore business** | Equità carico team — dato esiste, non mostrato come ranking |
| **Complessità** | Bassa |
| **Dipendenze** | `dipendenti_timesheet_entries` |
| **Rischi** | Permessi dipendenti |

---

## P1 — Importanti (fase 2)

Dopo P0: arricchiscono decisione operativa e direzionale senza bloccare il go-live.

### P1.1 Insight Strip + drill-down cliccabile

| Campo | Valore |
|-------|--------|
| **Valore business** | Ogni insight porta a tabella/grafico correlato |
| **Complessità** | Media |
| **Dipendenze** | P0.10, routing interno sezione |
| **Rischi** | UX incoerente se drill non implementato per tutti gli insight |

---

### P1.2 Mediana tempo chiusura

| Campo | Valore |
|-------|--------|
| **Valore business** | Metrica robusta vs outlier; complemento a media |
| **Complessità** | Bassa |
| **Dipendenze** | `lav_median_close` |
| **Rischi** | Nessuno |

---

### P1.3 Distribuzione per priorità

| Campo | Valore |
|-------|--------|
| **Valore business** | Capire mix urgenze nel carico |
| **Complessità** | Bassa |
| **Dipendenze** | `lavorazioni.priorita`, `app_settings` |
| **Rischi** | Priorità dinamiche da settings |

---

### P1.4 AR Aging

| Campo | Valore |
|-------|--------|
| **Valore business** | Qualità portafoglio crediti per amministrazione |
| **Complessità** | Media |
| **Dipendenze** | `customer_open_items`, view SQL consigliata |
| **Rischi** | Dati open items potrebbero essere incompleti su clienti legacy |

---

### P1.5 Win rate preventivi + funnel base

| Campo | Valore |
|-------|--------|
| **Valore business** | Efficacia commerciale |
| **Complessità** | Media |
| **Dipendenze** | `eco_preventivi_win_rate`, `eco_preventivi_funnel` |
| **Rischi** | Stati preventivo in `dettagli` jsonb — validare mapping |

---

### P1.6 Top mezzi per costo (da model esistente)

| Campo | Valore |
|-------|--------|
| **Valore business** | Asset costosi — **già calcolato, mai mostrato** |
| **Complessità** | Bassa |
| **Dipendenze** | `KpiPerformanceEconomic`, `top_mezzi_costo` |
| **Rischi** | Trust partial su manodopera |

---

### P1.7 Giorni copertura scorta

| Campo | Valore |
|-------|--------|
| **Valore business** | Anticipare stockout oltre semplice sotto-scorta |
| **Complessità** | Bassa |
| **Dipendenze** | `consumo_medio_mensile` su `magazzino_ricambi` |
| **Rischi** | `consumo_medio_mensile` potrebbe essere stale |

---

### P1.8 Matrice Cliente × Redditività

| Campo | Valore |
|-------|--------|
| **Valore business** | Decisione commerciale e pricing |
| **Complessità** | Alta |
| **Dipendenze** | Join `invoices.cliente_label` ≈ `mezzi.cliente`, costi per cliente |
| **Rischi** | **Join cliente testuale fragile** — documentare limitazione |

---

### P1.9 Matrice Mezzo × Costo

| Campo | Valore |
|-------|--------|
| **Valore business** | Identificare asset da rivalutare/rottamare |
| **Complessità** | Media |
| **Dipendenze** | `cross_mezzo_costo_matrix`, costi per mezzo |
| **Rischi** | Trust partial costi |

---

### P1.10 Compliance scadenze imminenti

| Campo | Valore |
|-------|--------|
| **Valore business** | Manutenzione preventiva e conformità — dati esistono, zero UI report |
| **Complessità** | Media |
| **Dipendenze** | `asset_compliance_rules`, `asset_timeline_projection` view |
| **Rischi** | Modulo lifecycle potrebbe non essere popolato su tutti i mezzi |

---

### P1.11 Costo manodopera visibile in sezione ORE

| Campo | Valore |
|-------|--------|
| **Valore business** | Trasparenza costo lavoro — oggi nascosto |
| **Complessità** | Media |
| **Dipendenze** | `manodopera_cost`, fetch schede |
| **Rischi** | Trust partial; badge obbligatorio |

---

### P1.12 Confronto periodo su cross KPI

| Campo | Valore |
|-------|--------|
| **Valore business** | Trend produttività e redditività |
| **Complessità** | Media |
| **Dipendenze** | P0.9, estensione `buildCrossAnalytics` |
| **Rischi** | Date mismatch tra domini |

---

### P1.13 Widget trend embedded per sezione (ex Grafici KPI)

| Campo | Valore |
|-------|--------|
| **Valore business** | Trend contestualizzati, non sezione isolata |
| **Complessità** | Media |
| **Dipendenze** | `kpi-series`, `report_saved_kpi_charts` migration |
| **Rischi** | Migrazione chart salvati utenti |

---

### P1.14 RPC aggregazioni periodo (performance)

| Campo | Valore |
|-------|--------|
| **Valore business** | Scalabilità con crescita dati — prerequisito enterprise |
| **Complessità** | Alta |
| **Dipendenze** | `list_lavorazioni_paginated` pattern, nuove RPC |
| **Rischi** | Duplicazione logica client/server — serve SSOT formule |

**Target RPC:** ingressi/chiusure per range, top N, timesheet SUM, movimenti aggregati.

---

### P1.15 Preventivo vs consuntivo

| Campo | Valore |
|-------|--------|
| **Valore business** | Controllo stime vs reale |
| **Complessità** | Alta |
| **Dipendenze** | `preventivi`, `invoice_links`, `movimenti_ricambi` per lavorazione |
| **Rischi** | Lavorazioni senza preventivo o fattura parziale |

---

### P1.16 Context AI V2 (allineamento catalogo metriche)

| Campo | Valore |
|-------|--------|
| **Valore business** | Report AI settimanale/mensile riflette tutti i domini — non solo operativo/flotta |
| **Complessità** | Media |
| **Dipendenze** | P0.9 (cross prefetch), P0.6 (crediti), `build-report-analysis-context.ts` |
| **Rischi** | Payload troppo grande → token limit; rispettare cap esistenti e RBAC |

**Blocchi da aggiungere al context:** economico (fatturato, crediti, preventivi), ore, magazzino, cross KPI, insight strip strutturati, compliance count.

---

### P1.17 Shortcut «Report settimana» / «Report mese»

| Campo | Valore |
|-------|--------|
| **Valore business** | Cadenza review senza configurare manualmente periodo/confronto |
| **Complessità** | Bassa |
| **Dipendenze** | P0.11, preset `date-ranges.ts`, toolbar periodo |
| **Rischi** | Basso — UX only |

**Comportamento:** chip nella sezione ANALISI IA imposta preset + confronto ottimale e avvia generazione (dopo prefetch derived).

---

### P1.18 Prefetch derived prima di generazione AI

| Campo | Valore |
|-------|--------|
| **Valore business** | Report AI completo anche se utente non ha espanso tutte le sezioni |
| **Complessità** | Media |
| **Dipendenze** | P0.9, `buildReportAnalysisContext` |
| **Rischi** | Latenza al click «Genera» — mostrare progresso |

---

### P1.19 Export PDF con sintesi AI

| Campo | Valore |
|-------|--------|
| **Valore business** | Condividere report narrativo con stakeholder esterni |
| **Complessità** | Media |
| **Dipendenze** | PDF bundle esistente, ultima analisi in cache |
| **Rischi** | Layout PDF lungo; sezione opzionale se non generata |

## P2 — Miglioramenti futuri (fase 3)

### P2.1 SANKEY catena preventivo→incasso

| Valore business | Visualizza perdite nella catena commerciale |
| Complessità | Alta |
| Dipendenze | P1.5, join multi-tabella |
| Rischi | Complessità UX; dati parziali su catena |

---

### P2.2 DSO e trend incassi

| Valore business | KPI finanziario standard |
| Complessità | Alta |
| Dipendenze | `payment_allocations`, `invoice_payments` |
| Rischi | Dati pagamenti legacy vs nuovo modello open items |

---

### P2.3 MTBF / MTTR per mezzo

| Valore business | Affidabilità asset quantificata |
| Complessità | Media |
| Dipendenze | `lav_mtbf`, `lav_mttr` |
| Rischi | Richiede storico sufficiente per mezzo |

---

### P2.4 Scatter ore vs ricambi per intervento

| Valore business | Trovare interventi anomali |
| Complessità | Alta |
| Dipendenze | Schede + movimenti per `lavorazione_id` |
| Rischi | Schede non sempre complete |

---

### P2.5 Saturazione team (heatmap)

| Valore business | Pianificazione capacità settimanale |
| Complessità | Media |
| Dipendenze | `saturazione_team` |
| Rischi | Basso |

---

### P2.6 Pareto clienti / treemap parco mezzi

| Valore business | Visualizzazione concentrazione |
| Complessità | Bassa-Media |
| Dipendenze | Dati classifiche esistenti |
| Rischi | Basso |

---

### P2.7 Lead time ordini fornitore

| Valore business | Valutazione fornitori |
| Complessità | Media |
| Dipendenze | `ordini_fornitori` status timeline |
| Rischi | Status `ricevuto` non sempre aggiornato puntualmente |

---

### P2.8 Margine per ricambio (scatter costo/vendita)

| Valore business | Pricing e anomalie |
| Complessità | Bassa |
| Dipendenze | `prezzo_vendita`, `costo` |
| Rischi | Prezzi vendita non sempre popolati |

---

### P2.9 Gap schede vs timesheet

| Valore business | Qualità dati ore |
| Complessità | Alta |
| Dipendenze | Match addetto nome ↔ dipendente_id |
| Rischi | **Match non garantito** |

---

### P2.10 Matrice operatore × produttività

| Valore business | Valutazione performance team |
| Complessità | Alta |
| Dipendenze | `created_by` su lavorazioni + timesheet |
| Rischi | Operatore DB ≠ dipendente timesheet |

---

### P2.11 Trend disponibilità flotta (snapshot giornaliero)

| Valore business | SLA trend nel tempo |
| Complessità | Molto alta |
| Dipendenze | **Pipeline** `fleet_disponibilita_trend` — background job |
| Rischi | Non retroattivo senza storico |

---

### P2.12 Rotazione stock

| Valore business | Efficienza magazzino |
| Complessità | Alta |
| Dipendenze | **Pipeline** snapshot capitale storico |
| Rischi | MV + refresh strategy |

---

### P2.13 Residuo fatturazione preventivi (view)

| Valore business | Pipeline ricavi pendenti |
| Complessità | Bassa |
| Dipendenze | View `preventivi_billing_status` già esiste |
| Rischi | Basso |

---

### P2.14 Mix ricavi per tipo riga fattura

| Valore business | Struttura ricavi |
| Complessità | Media |
| Dipendenze | `invoice_rows.tipo` |
| Rischi | Basso |

---

### P2.15 KM trend per mezzo

| Valore business | Correlazione utilizzo/guasti |
| Complessità | Media |
| Dipendenze | `asset_mileage_readings` |
| Rischi | Modulo km non usato su tutti i mezzi |

---

## P3 — Nice to have

### P3.1 Anomaly detection volume mensile (z-score)

| Valore business | Evidenziare mesi anomali automaticamente |
| Complessità | Media |
| Dipendenze | ≥12 mesi storico, background job |
| Rischi | Falsi positivi su stagionalità |

---

### P3.2 Storico report AI (snapshot persistiti)

| Valore business | Consultare report settimanali/mensili passati senza rigenerare |
| Complessità | Alta |
| Dipendenze | Nuova tabella `report_ai_snapshots` o storage blob; RBAC |
| Rischi | Scope storage; privacy dati aggregati |

**Nota:** la narrativa AI resta in sezione dedicata (P0.11 / P1.16) — non in insight strip.

---

### P3.3 Box plot tempi chiusura

| Valore business | Visualizzazione distribuzione |
| Complessità | Media |
| Dipendenze | DS chart primitive |
| Rischi | Basso — mediana in P1 copre 80% del valore |

---

### P3.4 Gauge completate vs target

| Valore business | Solo se target definito in settings |
| Complessità | Bassa |
| Dipendenze | **Target non esiste oggi in app_settings** — richiede feature settings |
| Rischi | Scope creep su settings |

---

### P3.5 Export sezione singola PDF/Excel

| Valore business | Condivisione report per area |
| Complessità | Media |
| Dipendenze | PDF engine esistente |
| Rischi | Layout export separato da UI |

---

## Roadmap sintetica

```
Fase 1 (P0) — 4-6 settimane
├── Ristrutturazione 6 sezioni + ANALISI IA mantenuta
├── Dedup KPI + Executive row
├── Aging backlog + grafico ingressi/chiusure
├── Crediti visibili + Oltre SLA drill-down
├── Cross analytics prefetch
├── Insight strip deterministica (complemento AI)
├── Non regressione sezione ANALISI IA
└── Ottimizzazione disponibilità flotta

Fase 2 (P1) — 6-8 settimane
├── Context AI V2 (tutti i domini + insight strutturati)
├── Shortcut report settimana/mese
├── Matrici eccezioni (cliente, mezzo, ricambio)
├── AR aging + funnel preventivi
├── Compliance scadenze
├── RPC aggregazioni periodo
├── Widget trend embedded (ex Grafici KPI)
├── Export PDF con sintesi AI
└── Preventivo vs consuntivo

Fase 3 (P2/P3) — backlog
├── SANKEY catena valore
├── Pipeline snapshot (flotta, rotazione stock)
├── Anomaly detection
└── Storico snapshot report AI
```

---

## Dipendenze architetturali trasversali

| Dipendenza | Blocca | Priorità risoluzione |
|------------|--------|---------------------|
| Fetch full-table client | Scalabilità >5000 lav / >50k movimenti | P1.14 RPC |
| Cliente come testo (no FK) | Redditività per cliente, join affidabili | Documentare; P2 entity_key join |
| Schede lazy-loaded | Costi manodopera trust partial | P1.11 prefetch schede su report load |
| Cross DTO incompleti | ANALISI TRASVERSALI + context AI incompleto | P0.9 prefetch |
| Manual override mensile | Incoerenza serie temporali | P0.11 |
| Nessuna MV reporting | Performance heatmap/top N su grandi volumi | P1.14 + P2.12 |

---

## Metriche di successo V2

| Metrica | Target |
|---------|--------|
| Time-to-insight (apertura pagina → prima decisione) | < 15 secondi |
| KPI duplicati in UI | 0 |
| Sezioni con almeno 1 drill-down azionabile | 6/6 |
| Cross analytics disponibili senza expand manuale | 100% |
| P0 insight con azione collegata | ≥ 80% |
| Report AI con tutti i domini RBAC nel context | 100% (post P1.16) |
| Caricamento executive row | < 3s su dataset produzione |

---

## Riferimenti

- Catalogo: `docs/report-analytics-catalog.json` (78 metriche)
- Blueprint UX: `docs/report-v2-blueprint.md`
- Audit: `docs/report-analytics-audit.md`
