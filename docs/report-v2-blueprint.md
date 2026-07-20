# Report V2 — Blueprint UX

> **Data:** 19 luglio 2026  
> **Fonte:** `docs/report-analytics-audit.md`, `docs/report-analytics-catalog.json`  
> **Principio guida:** ogni elemento deve supportare una **decisione** — operativa o direzionale. Niente KPI decorativi, niente duplicati.

---

## Architettura pagina

```
┌─────────────────────────────────────────────────────────────────┐
│ TOOLBAR: periodo · confronto · export PDF · integrità dati      │
├─────────────────────────────────────────────────────────────────┤
│ INSIGHT STRIP: max 3 alert + 2 trend (deterministici, leggeri)  │
├─────────────────────────────────────────────────────────────────┤
│ EXECUTIVE KPI ROW: 6 card cross-sezione (decisione rapida)      │
├─────────────────────────────────────────────────────────────────┤
│ SEZIONI ANALITICHE (accordion)                                   │
│   LAVORAZIONI · CLIENTI E MEZZI · MAGAZZINO · ORE · ECONOMICI  │
│   · ANALISI TRASVERSALI                                          │
│   ├─ KPI row · grafico · classifica/matrici · drill-down         │
├─────────────────────────────────────────────────────────────────┤
│ ANALISI IA (sezione dedicata — report narrativo periodico)       │
│   Sintesi esecutiva · KPI commentati · criticità · suggerimenti  │
│   [Genera report] preset settimana/mese + confronto              │
└─────────────────────────────────────────────────────────────────┘
```

**Rimosso / riorganizzato rispetto a V1:**
- Sezione GRAFICI KPI → widget trend embedded per sezione analitica
- KPI duplicati (`lav_open`/`lav-aperti`, `scorta`/`mag_critical`, `lav_clients`/`clienti`)
- `lav-saldo-periodo` come hero → sostituito da aging backlog
- `mezzi` in anagrafica come KPI periodo
- Capitale immobilizzato in CLIENTI → solo in MAGAZZINO

**Mantenuto e potenziato:**
- **ANALISI IA** — sezione dedicata per report completo settimanale/mensile (come oggi, con context arricchito in V2)
- Periodo analisi + periodo confronto (6 modalità)
- Integrity layer obbligatorio
- RBAC per sezione
- Manual entries override (con badge visivo)

---

# LAVORAZIONI

## Obiettivo della sezione

Il responsabile officina deve capire in 30 secondi:
1. Se sta **smaltendo** o **accumulando** lavoro
2. Dove sono i **ritardi** da intervenire
3. Quali **mezzi/clienti** assorbono più capacità

## Sottosezioni

### 1. Panoramica operativa

| Campo | Valore |
|-------|--------|
| **Scopo** | Stato WIP e throughput periodo |
| **Metriche** | `lav-chiusi`, `lav-periodo`, `lav-aperti`, `lav-tempo`, `lav-media-settimanale` |

### 2. Backlog e SLA

| Campo | Valore |
|-------|--------|
| **Scopo** | Identificare ritardi e interventi critici |
| **Metriche** | `lav-aperti`, `lav_late_sla`, `lav_aging_backlog`, `lav_recidiva` |

### 3. Trend e stagionalità

| Campo | Valore |
|-------|--------|
| **Scopo** | Capire andamento e pianificare capacità |
| **Metriche** | `lav_andamento_mensile`, `lav_heatmap_annuale` |

### 4. Classifiche operative

| Campo | Valore |
|-------|--------|
| **Scopo** | Concentrare attenzione su mezzi/clienti top |
| **Metriche** | `top_mezzi_interventi`, `top_clienti_interventi` (link a sezione CLIENTI) |

## Layout consigliato

```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│ Chiusure │ Ingressi │  Aperte  │ Tempo    │ Media/   │
│ periodo  │ periodo  │  (WIP)   │ medio gg │ settimana│
└──────────┴──────────┴──────────┴──────────┴──────────┘
┌───────────────────────────────────────────────────────┐
│ GRAFICO LINEE: Ingressi vs Chiusure (mensile)         │
└───────────────────────────────────────────────────────┘
┌─────────────────────┬─────────────────────────────────┐
│ STACKED BAR: Aging  │ HEATMAP: Chiusure anno×mese     │
│ backlog (0-7/14/30+)│                                 │
└─────────────────────┴─────────────────────────────────┘
┌─────────────────────┬─────────────────────────────────┐
│ TABELLA: Oltre SLA  │ TABELLA: Top mezzi interventi   │
│ (drill → lav)       │ (drill → lav filtrate)          │
└─────────────────────┴─────────────────────────────────┘
```

**Drill-down:**
- Card Oltre SLA → tabella interventi con codice, cliente, giorni apertura, priorità
- Top mezzo → lista lavorazioni del mezzo nel periodo
- Cella heatmap → filtro periodo al mese selezionato

## KPI principali

| Nome | Valore | Confronto | Trend | Visualizzazione | Priorità |
|------|--------|-----------|-------|-----------------|----------|
| Chiusure periodo | Count | Sì Δ% e assoluto | Sparkline 7gg | CARD | P0 |
| Carico periodo (ingressi) | Count | Sì | Sparkline | CARD | P0 |
| Interventi aperti | Count snapshot | No | — | CARD | P0 |
| Tempo medio chiusura | Giorni (avg) | Sì invert | Δ giorni | CARD | P0 |
| Mediana tempo chiusura | Giorni (P50) | Sì invert | — | CARD | P1 |
| Media chiusure/settimana | Ratio | Sì | — | CARD | P1 |
| Oltre SLA | Count | No | — | CARD alert | P0 |

## Grafici

| Titolo | Tipo | Asse X | Asse Y | Filtro periodo | Motivo |
|--------|------|--------|--------|----------------|--------|
| Ingressi vs chiusure | GRAFICO LINEE | Mese/settimana | Count (2 serie) | Range globale | Decisione: gap carico/smaltimento |
| Chiusure mensili | BARRE | Mese | Count | Anno selezionabile | Confronto mesi discreti |
| Aging backlog | STACKED BAR | Fascia giorni | Count aperte | Snapshot | Decisione: dove intervenire |
| Heatmap annuale | HEATMAP | Mese × Anno | Intensità chiusure | Multi-anno | Stagionalità e pianificazione |

## Tabelle

| Tabella | Colonne | Ordinamento | Uso operativo |
|---------|---------|-------------|---------------|
| Oltre SLA | Codice, Cliente, Mezzo, Giorni, Priorità, Stato | Giorni DESC | Prioritizzare smaltimento |
| Recidiva mezzi | Mezzo, Cliente, Interventi 30gg, Ultimo intervento | Count DESC | Investigare cause ricorrenti |
| Top mezzi | Mezzo, Cliente, Chiusure, Δ vs periodo prec. | Chiusure DESC | Allocare risorse |
| Top clienti interventi | Cliente, Chiusure, Δ | Chiusure DESC | Gestione account |

## Matrici

| Matrice | Assi | Celle | Decisione |
|---------|------|-------|-----------|
| Mese × Anno (heatmap) | Mese, Anno | Count chiusure | Stagionalità, mesi anomali |
| Priorità × Stato (futuro) | Priorità, Stato WIP | Count | Colli bottiglia workflow |

## Insight automatici

| Condizione | Messaggio | Azione suggerita |
|------------|-----------|------------------|
| `ingressi > chiusure` AND delta > 0 | "Il carico supera le chiusure di {N} interventi nel periodo" | Verificare capacità team e priorità |
| `lav_late_sla > 0` | "{N} interventi oltre 14 giorni — il più vecchio: {codice}" | Aprire tabella Oltre SLA |
| `deltaPct(chiusure) > 10%` | "Le chiusure sono aumentate del {X}% vs periodo precedente" | Analizzare causa (team, stagione) |
| `deltaPct(chiusure) < -10%` | "Le chiusure sono calate del {X}% — rischio accumulo backlog" | Controllare card Aperte e aging |
| `recidiva.count > 0` | "{N} mezzi con interventi ripetuti in 30 giorni" | Aprire tabella recidiva |
| `manualByMonth attivo` | "I dati di {mese} includono storico manuale importato" | Badge informativo, no azione |
| `avgClose diminuito > 2gg` | "Il tempo medio chiusura è migliorato di {N} giorni" | Confermare trend su grafico |

---

# CLIENTI E MEZZI

## Obiettivo della sezione

Capire:
1. Quali **clienti** hanno flotta **ferma** o a rischio SLA
2. Quali **mezzi** sono **critici** (guasti frequenti, alto costo)
3. Dove concentrare **manutenzione preventiva** (compliance)

## Sottosezioni

### 1. Disponibilità flotta

| Scopo | Metriche |
|-------|----------|
| SLA implicito verso clienti | `clienti`, `flotta-officina`, `clienti_disponibilita`, `clienti_sotto_soglia` |

### 2. Affidabilità asset

| Scopo | Metriche |
|-------|----------|
| Mezzi problematici | `mezzi_guasti_alta`, `guasti_per_tipo_attrezzatura`, `tempo_fermo_medio`, `lav_mttr`, `lav_mtbf` |

### 3. Classifiche e concentrazione

| Scopo | Metriche |
|-------|----------|
| Dove si concentra il lavoro | `top_clienti_interventi`, `top_mezzi_interventi`, `clienti_pareto_interventi` |

### 4. Compliance e lifecycle

| Scopo | Metriche |
|-------|----------|
| Scadenze imminenti | `compliance_scadenze_imminenti`, `km_trend_mezzo` |

## Layout consigliato

```
┌──────────┬──────────┬──────────┬──────────┐
│ Clienti  │ Mezzi in │ Clienti  │ Tempo    │
│ periodo  │ officina │ <75% disp│ fermo med│
└──────────┴──────────┴──────────┴──────────┘
┌─────────────────────────────────────────────┐
│ BARRE ORIZZONTALI: Disponibilità per cliente│
└─────────────────────────────────────────────┘
┌─────────────────────┬───────────────────────┐
│ DONUT: Guasti per │ TABELLA: Mezzi guasti │
│ tipo attrezzatura  │ alta frequenza        │
└─────────────────────┴───────────────────────┘
┌─────────────────────┬───────────────────────┐
│ TABELLA: Top       │ TIMELINE: Compliance │
│ clienti interventi │ scadenze imminenti    │
└─────────────────────┴───────────────────────┘
```

**Drill-down:**
- Cliente in tabella disponibilità → mezzi del cliente con stato (operativo/in officina)
- Mezzo guasti alta → storico interventi + costi (link sezione ECONOMICI)

## KPI principali

| Nome | Valore | Confronto | Trend | Viz | Priorità |
|------|--------|-----------|-------|-----|----------|
| Clienti nel periodo | Count | Sì | — | CARD | P0 |
| Mezzi in officina | Count | No | — | CARD | P1 |
| Clienti sotto soglia 75% | Count | No | — | CARD alert | P0 |
| Tempo medio fermo | Giorni | No | — | CARD | P1 |

## Grafici

| Titolo | Tipo | Asse X | Asse Y | Motivo |
|--------|------|--------|--------|--------|
| Disponibilità per cliente | BARRE | Cliente | % operativi | Confronto SLA tra clienti |
| Guasti per tipo | DONUT | Tipo attrezzatura | % | Focus tipologie problematiche |
| Pareto clienti | BARRE + linea | Cliente | Count + cumulativa % | Concentrazione 80/20 |
| Composizione parco | TREEMAP | Cliente/Marca | Count mezzi | Struttura flotta |

## Tabelle

| Tabella | Colonne | Ordinamento | Uso |
|---------|---------|-------------|-----|
| Disponibilità clienti | Cliente, Tot mezzi, In officina, Operativi, % | % ASC | Priorità assistenza clienti |
| Mezzi guasti alta | Mezzo, Cliente, Tipo, Frequenza, Ultimo intervento | Frequenza | Manutenzione straordinaria |
| Top clienti interventi | Cliente, Chiusure, % su totale, Δ | Chiusure DESC | Account management |
| Compliance scadenze | Mezzo, Cliente, Tipo scadenza, Scadenza, Giorni rimanenti | Giorni ASC | Pianificare adempimenti |

## Matrici

| Matrice | Assi | Decisione |
|---------|------|-----------|
| Cliente × Disponibilità | Cliente (righe), fascia % (colonne) | Eccezioni sotto soglia |
| Mezzo × Frequenza guasti | Mezzo, classe ALTA/MEDIA/BASSA | Asset da monitorare |
| Marca × Interventi (futuro) | Marca telaio, volume | Affidabilità per marca |

## Insight automatici

| Condizione | Messaggio | Azione |
|------------|-----------|--------|
| `disponibilita < 75%` per cliente | "Il cliente {X} ha disponibilità al {Y}% — sotto soglia" | Aprire dettaglio mezzi cliente |
| `clienti_sotto_soglia > 0` | "{N} clienti sotto il 75% di disponibilità" | Review tabella disponibilità |
| `mezzi_guasti_alta > 0` | "{N} mezzi con frequenza guasti elevata" | Aprire tabella mezzi critici |
| `compliance imminenti > 0` | "{N} scadenze compliance entro 30 giorni" | Aprire timeline compliance |
| `top_cliente > 30% chiusure` | "Il cliente {X} assorbe il {Y}% delle chiusure" | Valutare dedicazione risorse |

---

# MAGAZZINO E RICAMBI

## Obiettivo della sezione

Capire:
1. Cosa sta **uscendo** e a che **costo**
2. Cosa rischia di **finire** (sotto scorta, bassa copertura)
3. Quanto **capitale** è immobilizzato

## Sottosezioni

### 1. Consumo periodo

| Metriche | `ric-usati`, `mag_movement_value` |

### 2. Stock e rischio

| Metriche | `scorta`, `cap`, `mag_giorni_copertura` |

### 3. Approvvigionamento

| Metriche | `mag_orders`, `mag_valore_ordini`, `ordini_lead_time` |

### 4. Classifiche consumo

| Metriche | `top_ricambi`, `mag_movimenti_mensili` |

## Layout consigliato

```
┌──────────┬──────────┬──────────┬──────────┐
│ Ricambi  │ Valore   │ Sotto    │ Capitale │
│ utilizzati│movimentato│ scorta  │immobiliz.│
└──────────┴──────────┴──────────┴──────────┘
┌─────────────────────────────────────────────┐
│ STACKED BAR: Movimenti mensili entrate/uscite│
└─────────────────────────────────────────────┘
┌─────────────────────┬───────────────────────┐
│ TABELLA: Sotto      │ TABELLA: Top ricambi  │
│ scorta (dettaglio)  │ consumo               │
└─────────────────────┴───────────────────────┘
┌─────────────────────────────────────────────┐
│ HEATMAP: Giorni copertura per SKU critici   │
└─────────────────────────────────────────────┘
```

## KPI principali

| Nome | Valore | Confronto | Viz | Priorità |
|------|--------|-----------|-----|----------|
| Ricambi utilizzati | Qty | Sì | CARD | P0 |
| Valore movimentato | € | Sì invert | CARD | P0 |
| Sotto scorta | Count | No | CARD alert | P0 |
| Capitale immobilizzato | € snapshot | Δ periodo only | CARD | P1 |

## Grafici

| Titolo | Tipo | Asse X | Asse Y | Motivo |
|--------|------|--------|--------|--------|
| Movimenti mensili | STACKED BAR | Mese | Qty entrate+uscite | Dinamica flussi |
| Capitale nel tempo | AREA | Mese | € stock | Trend immobilizzo |
| Margine ricambi | SCATTER | Costo | Prezzo vendita | Outlier pricing |

## Tabelle

| Tabella | Colonne | Ordinamento | Uso |
|---------|---------|-------------|-----|
| Sotto scorta | Codice, Nome, Qty, Min, Δ vs min | Gap ASC | Riordino urgente |
| Top ricambi | Codice, Nome, Uscite, Valore, Δ | Uscite DESC | Pareto consumo |
| Lead time fornitori | Fornitore, Ordini, Avg giorni, Max | Giorni DESC | Valutare fornitori |

## Matrici

| Matrice | Assi | Decisione |
|---------|------|-----------|
| Ricambio × Rotazione | Consumo (asse X), Giorni copertura (Y) | Stockout vs slow mover |
| Mese × Tipo movimento | Mese, Entrata/Uscita/Δ capitale | Eccezioni flussi |

## Insight automatici

| Condizione | Messaggio | Azione |
|------------|-----------|--------|
| `scorta > 0` | "{N} ricambi sotto scorta minima" | Aprire tabella sotto scorta |
| `deltaPct(uscite) > 15%` | "I ricambi utilizzati sono aumentati del {X}%" | Analizzare top ricambi |
| `top_ricambi[0]` | "Il ricambio {codice} è il più consumato ({N} uscite)" | Verificare scorta e fornitore |
| `giorni_copertura < 7` per SKU | "{N} ricambi con meno di 7 giorni di copertura" | Riordino prioritario |

---

# ORE LAVORATE

## Obiettivo della sezione

Capire:
1. Quanto **lavoro** ha fatto il team
2. Se la **produttività** è allineata alle chiusure
3. Dove ci sono **picchi** (straordinari, assenze)

## Sottosezioni

### 1. Volume ore

| Metriche | `ore_total`, `ore_straordinari_pct`, `ore_assenze` |

### 2. Produttività

| Metriche | `ore_per_job`, `ore_per_dipendente`, `manodopera_cost` |

### 3. Capacità e qualità dati

| Metriche | `saturazione_team`, `ore_scheda_vs_timesheet` |

## Layout consigliato

```
┌──────────┬──────────┬──────────┬──────────┐
│ Ore      │ Ore/     │ % Straord│ Costo    │
│ totali   │intervento│          │manodopera│
└──────────┴──────────┴──────────┴──────────┘
┌─────────────────────┬───────────────────────┐
│ BARRE: Ore per     │ DONUT: Assenze per    │
│ dipendente         │ tipo                  │
└─────────────────────┴───────────────────────┘
┌─────────────────────────────────────────────┐
│ HEATMAP: Saturazione dipendente × settimana│
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ TABELLA: Timesheet dettaglio giornaliero    │
└─────────────────────────────────────────────┘
```

## KPI principali

| Nome | Valore | Confronto | Viz | Priorità |
|------|--------|-----------|-----|----------|
| Ore totali | Ore | Sì | CARD | P0 |
| Ore per intervento | Ratio | Sì | CARD | P1 |
| Costo manodopera | € | Sì | CARD (trust badge) | P1 |
| % Straordinari | % | Sì | CARD | P1 |

## Grafici

| Titolo | Tipo | Asse X | Asse Y | Motivo |
|--------|------|--------|--------|--------|
| Ore per dipendente | BARRE | Dipendente | Ore | Equità carico |
| Ordinario vs straord. | STACKED BAR | Settimana | Ore per tipo | Pressione capacità |
| Saturazione team | HEATMAP | Dipendente × Settimana | Ore | Picchi e sotto-utilizzo |

## Tabelle

| Tabella | Colonne | Ordinamento | Uso |
|---------|---------|-------------|-----|
| Timesheet giornaliero | Data, Dipendente, Ordinarie, Straord., Assenza | Data DESC | Controllo presenze |
| Gap schede/timesheet | Dipendente, Ore scheda, Ore timesheet, Δ | \|Δ\| DESC | Qualità dati |

## Matrici

| Matrice | Assi | Decisione |
|---------|------|-----------|
| Dipendente × Settimana | Ore registrate | Saturazione |
| Dipendente × Tipo ora | Ordinario/straord./assenza | Composizione carico |

## Insight automatici

| Condizione | Messaggio | Azione |
|------------|-----------|--------|
| `straordinari_pct > 20%` | "Le ore straordinarie sono il {X}% del totale" | Verificare saturazione heatmap |
| `ore_per_job` aumentato >15% | "Le ore per intervento sono aumentate" | Correlare con tipo interventi |
| `assenze > soglia` | "{N} giorni di assenza nel periodo" | Pianificazione capacità |
| `gap schede/timesheet > 10%` | "Disallineamento ore schede vs timesheet" | Review qualità dati |

---

# DATI ECONOMICI

## Obiettivo della sezione

Capire:
1. Quanto si **fattura** e quanto si **incassa**
2. Se i **costi** sono sotto controllo
3. Come performa la **pipeline commerciale** (preventivi)

## Sottosezioni

### 1. Ricavi e crediti

| Metriche | `eco_invoices`, `eco_da_incassare`, `eco_scadute`, `fatturato_mensile` |

### 2. Costi e margine

| Metriche | `cost-tot`, `eco_margine_operativo`, `eco_valore_medio_intervento` |

### 3. Pipeline commerciale

| Metriche | `eco_preventivi`, `eco_preventivi_approvati`, `eco_preventivi_win_rate`, `preventivi_billing_residuo` |

### 4. Classifiche economiche

| Metriche | `top_clienti_fatturato`, `top_mezzi_costo`, `eco_preventivo_vs_consuntivo` |

## Layout consigliato

```
┌──────────┬──────────┬──────────┬──────────┐
│Fatturato │ Da       │ Scadute  │ Costi    │
│ periodo  │incassare │          │manutenz. │
└──────────┴──────────┴──────────┴──────────┘
┌─────────────────────┬───────────────────────┐
│ LINEE: Fatturato   │ STACKED BAR: AR aging │
│ mensile            │                       │
└─────────────────────┴───────────────────────┘
┌─────────────────────┬───────────────────────┐
│ CARD: Margine op.  │ SANKEY: Funnel        │
│ stimato            │ preventivo→fattura    │
└─────────────────────┴───────────────────────┘
┌─────────────────────┬───────────────────────┐
│ TABELLA: Top       │ TABELLA: Preventivo  │
│ clienti fatturato  │ vs consuntivo        │
└─────────────────────┴───────────────────────┘
```

## KPI principali

| Nome | Valore | Confronto | Viz | Priorità |
|------|--------|-----------|-----|----------|
| Fatturato periodo | € + count | Sì prev_year | CARD | P0 |
| Da incassare | € | No | CARD alert | P0 |
| Fatture scadute | Count + € | No | CARD alert | P0 |
| Costi manutenzione | € | Sì invert | CARD (trust) | P0 |
| Margine operativo | € | No | CARD | P1 |
| Win rate preventivi | % | Sì | CARD | P1 |

## Grafici

| Titolo | Tipo | Asse X | Asse Y | Motivo |
|--------|------|--------|--------|--------|
| Fatturato mensile | GRAFICO LINEE | Mese | € | Trend ricavi |
| AR aging | STACKED BAR | Fascia giorni | € | Rischio crediti |
| Costi vs ricavi | BARRE grouped | Periodo | € costi + ricavi | Margine visivo |
| Funnel commerciale | SANKEY | Stati pipeline | Volume/€ | Perdite catena |
| Mix ricavi | DONUT | Tipo riga fattura | % | Struttura ricavi |

## Tabelle

| Tabella | Colonne | Ordinamento | Uso |
|---------|---------|-------------|-----|
| Top clienti fatturato | Cliente, Fatturato, % totale, Residuo | € DESC | Focus commerciale |
| Top mezzi costo | Mezzo, Cliente, Costo ricambi, Costo manodopera, Totale | Totale DESC | Asset costosi |
| Preventivo vs consuntivo | Codice lav., Preventivo €, Consuntivo €, Δ%, Δ€ | \|Δ%\| DESC | Controllo stime |
| Fatture scadute | Numero, Cliente, Scadenza, Residuo, Giorni ritardo | Ritardo DESC | Sollecito incasso |

## Matrici

| Matrice | Assi | Decisione |
|---------|------|-----------|
| Cliente × Redditività | Fatturato vs Costo (quadranti) | Clienti profittevoli vs costosi |
| Mese × Tipo ricavo | Mese, tipo riga | Mix nel tempo |

## Insight automatici

| Condizione | Messaggio | Azione |
|------------|-----------|--------|
| `deltaPct(fatturato) > 10%` | "Fatturato €{X} (+{Y}% vs periodo precedente)" | Analizzare top clienti |
| `eco_scadute > 0` | "{N} fatture scadute per €{X}" | Aprire tabella scadute |
| `da_incassare > soglia` | "Crediti aperti: €{X}" | Review AR aging |
| `deltaPct(cost-tot) > 10%` | "Costi manutenzione +{X}%" | Drill-down top mezzi costo |
| `margine < 0` | "Margine operativo stimato negativo nel periodo" | Review costi vs fatturato |
| `win_rate < soglia` | "Win rate preventivi al {X}% — sotto target" | Analizzare funnel |

---

# ANALISI TRASVERSALI

## Obiettivo della sezione

Rispondere a domande che **attraversano domini**:
- L'officina è **produttiva**?
- Quanto **costa** mediamente un intervento?
- Quanto **valore** genera ogni ora?
- Dove sono le **anomalie** e le **correlazioni**?

## Sottosezioni

### 1. KPI sintetici cross-domain

| Metriche | `cross_efficiency`, `cross_parts_job`, `cross_cost_job`, `cross_value_hour` |

### 2. Matrici eccezioni

| Metriche | `cross_cliente_redditivita_matrix`, `cross_mezzo_costo_matrix`, `cross_ricambio_rotazione_matrix` |

### 3. Correlazioni e catena valore

| Metriche | `cross_sankey_catena_valore`, `cross_scatter_ore_ricambi`, `cross_operatore_produttivita` |

## Layout consigliato

```
┌──────────┬──────────┬──────────┬──────────┐
│Efficienza│ Ricambi/ │ Costo    │ Valore/  │
│ int/ore  │intervento│ medio lav│ ora      │
└──────────┴──────────┴──────────┴──────────┘
┌─────────────────────┬───────────────────────┐
│ MATRICE: Cliente ×  │ MATRICE: Mezzo ×     │
│ redditività         │ costo manutenzione   │
└─────────────────────┴───────────────────────┘
┌─────────────────────────────────────────────┐
│ SANKEY: Catena preventivo → incasso         │
└─────────────────────────────────────────────┘
┌─────────────────────┬───────────────────────┐
│ SCATTER: Ore vs     │ MATRICE: Ricambio ×  │
│ ricambi/intervento  │ rotazione            │
└─────────────────────┴───────────────────────┘
```

**Prerequisito:** tutte le sezioni fonte devono avere pubblicato i DTO derived (o prefetch automatico all'apertura sezione).

## KPI principali

| Nome | Formula | Viz | Priorità |
|------|---------|-----|----------|
| Efficienza officina | chiusure / ore | CARD | P0 |
| Ricambi per intervento | qty / chiusure | CARD | P0 |
| Costo medio lavorazione | costi / chiusure | CARD | P0 |
| Valore per ora | fatturato / ore | CARD | P0 |

## Grafici

| Titolo | Tipo | Motivo |
|--------|------|--------|
| Catena valore | SANKEY | Dove si perde valore preventivo→incasso |
| Ore vs ricambi | SCATTER | Interventi anomali (outlier) |
| Redditività clienti | MATRICE | Quadranti profitto/perdita |
| Mezzo costo×frequenza | MATRICE | Asset da rivalutare |

## Tabelle

| Tabella | Uso |
|---------|-----|
| Interventi outlier (scatter) | Investigare anomalie ore/ricambi |
| Operatori produttività | Performance team (se match dati) |

## Matrici (complete)

| Matrice | Righe | Colonne | Valore cella | Decisione |
|---------|-------|---------|--------------|-----------|
| Cliente × Redditività | Cliente | Fascia margine (alto/medio/basso/negativo) | Count o € | Pricing e servizio |
| Mezzo × Costo manutenzione | Mezzo | Fascia costo + frequenza | € e count | Rottamare vs riparare |
| Ricambio × Rotazione | Ricambio | Consumo vs copertura giorni | Risk score | Riordino vs destock |
| Operatore × Produttività | Operatore | Chiusure, ore, int/ore | Ratio | Valutazione performance |
| Mese × Anomalia volume | Mese | z-score vs media | Flag anomalia | Investigare eventi |

## Insight automatici

| Condizione | Messaggio | Azione |
|------------|-----------|--------|
| `cross_efficiency` sotto media storica | "Produttività {X} int/ore — sotto la media" | Correlare con assenze e backlog |
| `cross_value_hour` in calo | "Valore/ora sceso a €{X}" | Verificare mix lavori e prezzi |
| Cliente in quadrante negativo | "Il cliente {X} ha costi superiori al fatturato" | Review contratto/prezzi |
| Intervento outlier scatter | "{N} interventi con rapporto ore/ricambi anomalo" | Aprire dettaglio |
| `cross_cost_job` in aumento >10% | "Costo medio lavorazione +{X}%" | Drill-down top mezzi costo |

---

# ANALISI IA

## Obiettivo della sezione

Offrire ogni **settimana** o **mese** un **report narrativo completo** dell'andamento aziendale: leggibile in pochi minuti, basato su **tutti i dati reali** del gestionale e sugli **eventi** del periodo (diario operativo, alert, anomalie), senza la complessità delle 6 sezioni analitiche.

**Pubblico:** titolare, responsabile officina, direzione — chi vuole il quadro d'insieme prima del drill-down numerico.

**Relazione con altre parti della pagina:**

| Componente | Ruolo |
|------------|-------|
| Insight strip (sopra) | 3-5 righe deterministiche, sempre visibili — anteprima leggera |
| 6 sezioni analitiche | Dettaglio numerico, grafici, tabelle — verifica e drill-down |
| **ANALISI IA** | Report sintetico **on-demand** — narrativa strutturata su tutto il periodo |

## Sottosezioni (output UI)

### 1. Generazione report

| Campo | Valore |
|-------|--------|
| **Scopo** | Avviare analisi per il periodo/confronto selezionato nella toolbar |
| **Azione** | Pulsante «Genera report» (+ shortcut preset settimana/mese) |

### 2. Sintesi esecutiva

| Campo | Valore |
|-------|--------|
| **Scopo** | Paragrafo iniziale: come è andato il periodo in linguaggio naturale |
| **Fonte output** | `executiveSummary` |

### 3. KPI commentati

| Campo | Valore |
|-------|--------|
| **Scopo** | 5-8 numeri chiave con spiegazione (non solo card) |
| **Fonte output** | `kpiPrincipali` |

### 4. Criticità e anomalie

| Campo | Valore |
|-------|--------|
| **Scopo** | Cosa richiede attenzione — con gravità e confidenza |
| **Fonte output** | `anomalieRilevate`, `criticita` |

### 5. Trend positivi

| Campo | Valore |
|-------|--------|
| **Scopo** | Cosa sta migliorando — bilanciamento narrativo |
| **Fonte output** | `trendPositivi` |

### 6. Suggerimenti e priorità

| Campo | Valore |
|-------|--------|
| **Scopo** | Azioni concrete ordinate per urgenza |
| **Fonte output** | `suggerimentiOperativi`, `prioritaImmediate` |

### 7. Valutazione complessiva

| Campo | Valore |
|-------|--------|
| **Scopo** | Giudizio sintetico + punteggio 1-10 |
| **Fonte output** | `valutazioneGenerale` |

## Layout consigliato

```
┌─────────────────────────────────────────────────────────────┐
│ Header: «Report del periodo» · 12/07 – 19/07 · vs sett. prec. │
│ [Genera report]  [Esporta PDF]  Ultima generazione: ieri 09:00 │
├─────────────────────────────────────────────────────────────┤
│ SINTESI ESECUTIVA (testo, max ~8 righe)                      │
├─────────────────────────────────────────────────────────────┤
│ VALUTAZIONE: ████████░░ 8/10                                 │
├──────────────────────┬──────────────────────────────────────┤
│ KPI COMMENTATI       │ PRIORITÀ IMMEDIATE                    │
│ (lista 5-8 voci)     │ (azioni con scadenza)                 │
├──────────────────────┴──────────────────────────────────────┤
│ CRITICITÀ / ANOMALIE (badge gravità)                         │
├─────────────────────────────────────────────────────────────┤
│ TREND POSITIVI                                               │
├─────────────────────────────────────────────────────────────┤
│ SUGGERIMENTI OPERATIVI (priorità alta/media/bassa)           │
├─────────────────────────────────────────────────────────────┤
│ Note qualità dati (se trust partial / manual override)         │
└─────────────────────────────────────────────────────────────┘
```

**Default collapsed:** sì (come oggi) — non blocca chi vuole solo i numeri.  
**Posizione:** ultima sezione della pagina (dopo ANALISI TRASVERSALI) oppure seconda (dopo executive row) se preferenza utente — **default: ultima**, generazione esplicita.

## Cadenza consigliata

| Uso | Preset periodo | Confronto | Frequenza |
|-----|----------------|-----------|-----------|
| Review settimanale | `questa_settimana` o `settimana_scorsa` | `prev_period` | Ogni lunedì |
| Review mensile | `questo_mese` o `mese_scorso` | `prev_year` o `prev_period` | Fine mese / inizio mese |
| Review trimestrale | `trimestre_corrente` | `prev_year` | Opzionale |

**Shortcut UI nella sezione:** chip «Report settimana» / «Report mese» che impostano preset + confronto ottimale e avviano generazione.

## Input dati (context V2 — arricchimento rispetto a oggi)

Oltre a quanto già inviato oggi (`executive`, `trends`, `fleet`, `alerts`, `tops`, `operationalDiary`, `compareDetail`):

| Blocco aggiuntivo V2 | Fonte | Perché nel report |
|---------------------|-------|-------------------|
| Economico | fatturato, da incassare, scadute, preventivi, win rate | Quadro finanziario |
| Ore | ore totali, % straordinari, ore/intervento | Produttività team |
| Magazzino | sotto scorta, top ricambi, valore movimentato | Supply e costi |
| Cross | efficiency, cost/job, value/hour, parts/job | Sintesi trasversale |
| Insight deterministici | insight strip già calcolati | Coerenza narrativa |
| Compliance | scadenze imminenti (count) | Rischi futuri |
| Integrità | badge manual override, trust partial | Trasparenza in `dataQualityNotes` |

**Eventi e avvenimenti:**
- `operational_diary_entries` nel periodo (già presente) — **fonte primaria contesto qualitativo**
- Alert performance (open-late, sotto-scorta, recidiva, guasti-alta)
- Note integrità audit se dati degradati

## KPI principali nel report AI

Non duplicare le card — il modello **commenta** i KPI già calcolati:

| Area | KPI da includere nel context | Priorità narrativa |
|------|------------------------------|-------------------|
| Operativo | chiusure, ingressi, aperte, tempo medio, oltre SLA | Alta |
| Flotta | disponibilità clienti critici, mezzi in officina | Alta |
| Economico | fatturato, costi, margine stimato, crediti | Alta |
| Magazzino | sotto scorta, consumo ricambi | Media |
| Team | ore, straordinari | Media |
| Cross | efficienza, valore/ora | Media |

## Confronto periodo nel report AI

| Elemento | Comportamento V2 |
|----------|------------------|
| Context | Range confronto + `compareDetail` + delta % sui KPI principali |
| Output | Trend positivi/negativi espliciti nel testo |
| Confidenza | `bassa` se confronto su medie mobili (`avg_12_months`) — indicare in `dataQualityNotes` |

## Insight automatici (deterministici → input AI)

Gli insight della insight strip e delle sezioni alimentano il context come **fatti strutturati** (non solo testo libero), così il modello non li reinventa:

| Condizione | Fatto passato al context |
|------------|--------------------------|
| Carico > smaltimento | `{ type: "backlog_pressure", delta: N }` |
| Clienti sotto 75% | `{ type: "fleet_sla_risk", count: N }` |
| Fatture scadute | `{ type: "credit_risk", amount: €X }` |
| Ricambi +15% | `{ type: "parts_spike", pct: X }` |

## Export e persistenza

| Funzione | V2 |
|----------|-----|
| Cache | Per fingerprint + periodo + compare (già oggi) |
| PDF bundle | Includere ultima analisi AI generata se presente |
| Storico | Nice-to-have P3 — tabella `report_ai_snapshots` (non esiste oggi) |

## RBAC

| Permesso | Comportamento |
|----------|---------------|
| Nessun permesso dedicato (come oggi) | Visibile a chi vede la pagina Report |
| Context rispetta RBAC | Solo dati dei domini accessibili all'utente |
| Sezione economica negata | `dataQualityNotes`: «Dati fatturazione non inclusi per permessi» |

---

## Executive KPI Row (cross-sezione)

Card sempre visibili sopra le sezioni — **max 6**, una per decisione critica:

| Card | Sezione fonte | Perché executive |
|------|---------------|------------------|
| Chiusure periodo | LAVORAZIONI | Throughput |
| Interventi aperti | LAVORAZIONI | WIP |
| Oltre SLA | LAVORAZIONI | Urgenza operativa |
| Fatturato periodo | ECONOMICI | Ricavi |
| Da incassare | ECONOMICI | Cash risk |
| Sotto scorta | MAGAZZINO | Rischio operativo |

---

## Insight Strip (narrativa deterministica leggera)

Posizione: sotto toolbar, sopra executive row.

**Ruolo:** anteprima immediata (3-5 righe) — **non sostituisce** la sezione ANALISI IA.

**Regole:**
- Max 5 messaggi per periodo
- Priorità: alert operativi > crediti > trend significativi
- Ogni messaggio cliccabile → drill-down sezione
- Badge `trust: partial` su costi/manodopera
- Badge `dati manuali` se manual override attivo
- Link «Approfondisci con report AI →» verso sezione ANALISI IA (scroll + focus)

---

## Confronto periodi V2

| Miglioramento | Applicazione |
|---------------|--------------|
| Confronto su tutti KPI P0 periodo | Uniforme |
| Mediana + media su tempi chiusura | LAVORAZIONI |
| Row delta su tutte le classifiche | Tutte le tabelle top N |
| Confronto cross KPI (nuovo) | ANALISI TRASVERSALI |
| Badge scaling su avg_12_months | Quando confronto usa media mobile |
| Allineamento sparkline e KPI | Fix incoerenza manual override |

---

## RBAC e visibilità

| Sezione | Permesso |
|---------|----------|
| LAVORAZIONI | `lavorazioni` read |
| CLIENTI E MEZZI | `mezzi` OR `lavorazioni` read |
| MAGAZZINO E RICAMBI | `magazzino` read |
| ORE LAVORATE | `dipendenti` read |
| DATI ECONOMICI | `fatturazione` read |
| ANALISI TRASVERSALI | Visibile se ≥2 sezioni fonte accessibili |
| ANALISI IA | Nessuno dedicato (come oggi); context filtrato per RBAC domini |

Executive row: mostra solo card delle sezioni permesse.  
Report AI: include solo blocchi dati per cui l'utente ha permesso lettura.

---

## Riferimenti

- Catalogo metriche: `docs/report-analytics-catalog.json`
- Audit dati: `docs/report-analytics-audit.md`
- Priorità implementazione: `docs/report-v2-priorities.md`
