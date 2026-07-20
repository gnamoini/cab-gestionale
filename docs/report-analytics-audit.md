# Audit completo — Sezione REPORT del gestionale CAB

> **Data audit:** 19 luglio 2026  
> **Scopo:** fotografia precisa dello stato attuale e delle potenzialità BI reali, senza proposte di implementazione.  
> **Vincolo:** nessun dato inventato — solo ciò che esiste in codebase e database.

---

## Indice

1. [Architettura report attuale](#fase-1--architettura-report-attuale)
2. [Statistiche attuali per sezione](#fase-2--statistiche-attuali)
3. [Modello dati](#fase-3--modello-dati)
4. [Dati disponibili per dominio](#fase-4--dati-disponibili)
5. [Analytics possibili](#fase-5--analytics-possibili)
6. [Visualizzazioni suggerite](#fase-6--visualizzazioni-possibili)
7. [Analisi trasversali](#fase-7--analisi-trasversali)
8. [Confronto periodi](#fase-8--confronto-periodi)
9. [Insight automatici](#fase-9--insight-automatici) (incl. [9.9 strip vs AI](#99-insight-strip-vs-analisi-ia-v2))
10. [Performance](#fase-10--performance)

---

# FASE 1 — ARCHITETTURA REPORT ATTUALE

## 1.1 Panoramica

La pagina Report (`/report`) è un sistema analytics **client-heavy** con prefetch server BFF, gate di integrità dati obbligatorio, sezioni lazy-loaded e stato derivato condiviso tra domini.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SSR: app/(gestionale)/report/page.tsx                                  │
│    ├─ prefetchCriticalPage("report")  → settings                        │
│    └─ ReportDeferredHydration         → 6 fetch paralleli BFF            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ReportAnalyticsView (orchestratore client)                              │
│    ├─ Periodo + confronto (localStorage + URL query)                    │
│    ├─ useReportLiveData → useReportLiveDataDerived                        │
│    ├─ ReportDataIntegrityLayer.buildValidatedDataset                    │
│    ├─ buildReportDerivedBundle (cache single-slot)                      │
│    ├─ buildReportModel (KPI strip periodo)                              │
│    └─ ReportPerformanceGate → buildKpiPerformanceModel                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
   Lazy sections            DerivedContext              Grafici KPI
   (publish DTO)            (cross analytics)           (saved charts)
```

## 1.2 Route e pagine

| File | Responsabilità | Dipendenze chiave |
|------|----------------|-------------------|
| `app/(gestionale)/report/page.tsx` | Entry RSC: prefetch critico + hydration | `prefetchCriticalPage`, `ReportDeferredHydration`, `ReportViewLazy` |
| `app/(gestionale)/report/loading.tsx` | Skeleton route | `ReportPageStructure mode="skeleton"` |
| `app/(gestionale)/report/design-system-preview/page.tsx` | Preview DS (solo dev) | design-system primitives |
| `components/gestionale/report/report-view.tsx` | Shell con dynamic import | `ReportAnalyticsView`, PDF warmup |
| `components/gestionale/report/report-deferred-hydration.tsx` | Prefetch deferred 6 wave | `prefetchDeferredPage` |

**Layout dedicato:** assente — eredita `app/(gestionale)/`.

**URL params supportati:** `from`, `to`, `preset`, `compare`.

## 1.3 Sezioni report (configurazione)

Definite in `components/report/report-sections-config.ts`:

| ID | Titolo UI | Permesso RBAC | Partecipa Derived | Publish key |
|----|-----------|---------------|-------------------|-------------|
| `analisi_ai` | ANALISI IA | nessuno | No | — |
| `lavorazioni` | LAVORAZIONI | `lavorazioni` read | Sì | `operational` |
| `clienti_mezzi` | CLIENTI E MEZZI | `mezzi` OR `lavorazioni` | No | — |
| `magazzino_ricambi` | MAGAZZINO E RICAMBI | `magazzino` read | Sì | `warehouse` |
| `ore_lavorate` | ORE LAVORATE | `dipendenti` read | Sì | `labor` |
| `dati_economici` | DATI ECONOMICI | `fatturazione` read | Sì | `economic` |
| `analisi_incrociate` | ANALISI | nessuno | Sì (read-only) | — |
| `grafici_kpi` | GRAFICI KPI | nessuno | No | — |

> **Nota riprogettazione (V2):** 6 macro-aree analitiche + **ANALISI IA** come sezione dedicata (report narrativo periodico) + `grafici_kpi` riassorbiti come widget trend nelle singole sezioni.

## 1.4 Layer dati (pipeline)

### Layer 1 — Fetch BFF server

**File:** `lib/bff/report-bundle-fetch-server.ts`  
**Funzione:** `fetchReportDataDTOServer`  
**Fetch paralleli:** lavorazioni, magazzino, mezzi, movimenti, manual entries, settings.

### Layer 2 — React Query (client)

**Hook centrale:** `lib/report/use-report-live-data.ts` → `useReportLiveData`

| Query | Hook | Variante |
|-------|------|----------|
| Lavorazioni | `useReportLavorazioniQuery` | report |
| Magazzino | `useMagazzinoListQuery` | `variant: "report"` |
| Mezzi | `useMezziListQuery` | `variant: "report"` (deferibile) |
| Movimenti | `useMovimentiListQuery` | deferibile |
| Manual entries | `useReportManualEntriesQuery` | deferibile |
| Settings | `useCabAppSettingsPayloadQuery` | static tier |

**Stale policy:** `GESTIONALE_REPORT_STALE_MS` (definito in view-query-opts).

### Layer 3 — Integrity Layer (gate obbligatorio)

**File:** `lib/report/report-data-integrity-layer.ts`  
**Classe:** `ReportDataIntegrityLayer.buildValidatedDataset`

Responsabilità:
- Filtra orfani (movimenti senza ricambio, lavorazioni senza mezzo)
- Fallback su errori query
- Audit findings (`report-integrity-audit.ts`)
- Rilevamento cache drift (`detectCacheDrift`)
- Costruzione truth dataset (`report-truth-dataset.ts`)

**Regola architetturale:** nessun KPI deve bypassare questo layer.

### Layer 4 — Derived cache

**File:** `lib/report/report-derived-cache.ts`  
**Funzione:** `buildReportDerivedBundle`

Contiene:
- `magLogSorted` — log movimenti ordinato
- Semantic index input
- Cache mensile magazzino (`getMagPeriodAgg`)
- Fingerprint invalidation (`fingerprintReportSnapshot`)

### Layer 5 — Semantic index (lavorazioni)

**File:** `lib/report/report-semantic-index.ts`  
**Funzione:** `buildReportSemanticIndex`

Precomputa:
- Completate per mese/settimana (DB + override manuali)
- Trend MoM / YoY
- Sparkline 7 giorni
- Tempo medio chiusura
- Top mezzi/clienti
- Year matrix + forecast rows
- Temporal model per anno selezionato

### Layer 6 — KPI models

| Modello | File | Output |
|---------|------|--------|
| Period KPI cards | `lib/report/build-report-model.ts` | `ReportModel.kpis` |
| Performance KPI | `lib/report/kpi-performance/build-kpi-performance-model.ts` | Fleet, alerts, executive |
| Domain analytics | `lib/report/report-domain-analytics.ts` | DTO per sezione |
| Cross analytics | `buildCrossAnalytics` in stesso file | 4 KPI derivati |

### Layer 7 — Section publish (cross-domain)

**Provider:** `components/report/report-analytics-derived-context.tsx`  
**Pattern:** ogni sezione lazy chiama `publish*Analytics` → DTO in snapshot condiviso.

**Stale guard:** `sections/use-section-publish.ts` — `requestId` monotonic + `rangeKey` match.

## 1.5 Componenti principali (99 file in `components/report/`)

### Orchestrazione

| File | Responsabilità |
|------|----------------|
| `report-analytics-view.tsx` | Orchestratore: periodo, live data, derived, KPI model |
| `report-page-structure.tsx` | Shell layout live/skeleton |
| `report-controls.tsx` | Preset periodo, date custom, compare mode |
| `report-compare-banner.tsx` | Banner confronto attivo |
| `report-period-summary.tsx` | Riepilogo periodo |
| `report-integrity-status-badge.tsx` | Badge stato integrità |

### Layout zones

| File | Zona |
|------|------|
| `layout/report-toolbar.tsx` | Header + filtri + export PDF |
| `layout/report-sections.tsx` | Mount lazy sezioni |
| `layout/report-performance-gate.tsx` | Merge KPI periodo + performance |
| `layout/report-executive-strip.tsx` | Strip testuale esecutiva |
| `layout/report-executive-kpi-section.tsx` | KPI unificati |
| `layout/report-fleet-zone.tsx` | Zona flotta |
| `layout/report-maintenance-zone.tsx` | Zona manutenzione |
| `layout/report-compliance-zone.tsx` | Zona compliance |
| `layout/report-team-timesheet-zone.tsx` | Zona timesheet |
| `layout/report-ai-analysis-zone.tsx` | Shell AI |

### Sezioni dominio (`sections/`)

| File | Sezione |
|------|---------|
| `report-lavorazioni-section.tsx` | LAVORAZIONI |
| `report-clienti-mezzi-section.tsx` | CLIENTI E MEZZI |
| `report-magazzino-section.tsx` | MAGAZZINO |
| `report-ore-section.tsx` | ORE |
| `report-economici-section.tsx` | DATI ECONOMICI |
| `report-cross-section.tsx` | ANALISI incrociate |
| `report-ai-section.tsx` | ANALISI IA |
| `report-kpi-charts-section.tsx` | GRAFICI KPI |

### Metric rendering

| File | Ruolo |
|------|-------|
| `report-kpi-card.tsx`, `report-kpi-grid.tsx` | Card KPI legacy |
| `report-unified-kpi-grid.tsx` | Grid KPI unificata |
| `report-metric-card.tsx`, `report-metric-renderer.tsx` | Registry-driven |
| `report-metric-matrix.tsx` | Matrice temporale |
| `report-metric-temporal.tsx` | Vista temporale |
| `report-metric-compare-section.tsx` | UI confronto |
| `report-charts.tsx`, `report-sparkline.tsx` | Grafici |
| `report-tops.tsx`, `report-classifiche-operative-panel.tsx` | Classifiche |
| `report-lavorazioni-temporal-section.tsx` | Heatmap/matrix annuale |

### Design system (`design-system/`)

Primitives: `metric-card`, `chart/multi-series-line-chart`, `data-table`, `matrix`, `narrative-block`, `status-badge`.  
Tokens: densità, colori semantici, tipografia.

## 1.6 Hook e servizi

### Hook report-specifici

| Path | Export | Ruolo |
|------|--------|-------|
| `lib/report/use-report-live-data.ts` | `useReportLiveData` | Aggregatore dati centrale |
| `lib/report/use-report-live-data-derived.ts` | `useReportLiveDataDerived` | Integrity + fingerprint |
| `src/hooks/gestionale/use-report-queries.ts` | `useReportLavorazioniQuery`, `useReportManualEntriesQuery` | Query lavorazioni + manual |
| `src/hooks/use-report-timesheet-kpi.ts` | `useReportTimesheetKpi` | KPI timesheet (lazy) |
| `src/hooks/gestionale/use-saved-kpi-charts.ts` | CRUD grafici salvati | Persistenza chart |
| `lib/report/kpi-performance/use-report-kpi-performance-data.ts` | `useReportKpiPerformanceData` | Bundle performance |
| `components/report/use-report-derived-prefetch.ts` | `useReportDerivedPrefetch` | Prefetch derived su cambio periodo |

### Servizi

| Path | Ruolo |
|------|-------|
| `src/services/report-manual-entries.service.ts` | CRUD `report_manual_entries` |
| `src/services/report-saved-kpi-charts.service.ts` | CRUD `report_saved_kpi_charts` |
| `lib/report/report-analysis/report-analysis-service.server.ts` | AI analysis (Gemini) |
| `lib/report/calendar-report-service.ts` | Analytics calendario (riusato da dashboard) |

## 1.7 API routes

| Route | Metodi | Auth | Ruolo |
|-------|--------|------|-------|
| `app/api/report/analysis/route.ts` | POST | `verifyServerPageRead("report")` | Genera analisi AI |
| `app/api/report/manual-entries/import/route.ts` | POST, GET | read/write report | Import XLSX manual entries + template |

**PDF:** export via `openPdfArtifact("report-bundle")` — non route `/api/report/`.

## 1.8 Registry metriche (SSOT)

**File:** `lib/report/metrics/report-metric-registry.ts`  
**Array:** `REPORT_METRIC_REGISTRY` (~40 entry)

Ogni entry definisce: `id`, `owner` (sezione), `label`, `description`, `unit`, `aggregation`, `applicability` (period/snapshot/derived), `trendSemantics`, `trust`, `series` (opzionale).

**Legacy:** `lib/report/report-kpi-catalog.ts` (wrapper deprecato).

## 1.9 Filtri e periodo

### Preset periodo (`lib/report/date-ranges.ts`)

17 preset in `ReportPeriodPreset`: oggi, ieri, questa settimana, settimana scorsa, questo mese, mese scorso, trimestre corrente/precedente, anno corrente/precedente, ultimi 7/30/90/365 giorni, custom.

**Persistenza:** `localStorage` key `gestionale.report.period.v1` (debounce 300ms).

### Confronto periodo (`ReportCompareMode`)

| Mode | Finestra confronto |
|------|-------------------|
| `none` | Nessuno |
| `prev_period` | Stessa durata immediatamente prima |
| `prev_year` | Stesse date calendario −1 anno |
| `avg_3_months` | 3 mesi prima, scalato alla durata corrente |
| `avg_12_months` | 12 mesi prima, scalato |
| `avg_3_years` | 36 mesi prima, scalato |
| `custom_range` | Date utente |

**Scaling:** `compareBaselineValue(raw, compareRange, currentRange, mode)` per medie mobili.

**Delta:** `deltaPct(current, baseline)` in `date-ranges.ts`.

## 1.10 Cache e invalidazione

| Layer | Meccanismo |
|-------|------------|
| React Query | Per-entity keys, variant `report` |
| Derived bundle | In-memory single-slot, invalidato da fingerprint |
| Mag month agg | Map per bundle keyed by `dateRangeKey` |
| AI analysis | Cache client keyed by preset+compare+period+fingerprint |
| Period prefs | localStorage |
| Magazzino manual | localStorage (`magazzino-manual-storage.ts`) |
| Invalidazione globale | `invalidateReportUniverse` → tabelle gestionale + broadcast |
| Drift | Warn > stale MS, auto-refresh > 300s via `scheduleReportBroadcastRefresh` (debounce 400ms, cooldown 60s) |

**Tabelle universe** (`report-universe-constants.ts`): `lavorazioni`, `magazzino_ricambi`, `movimenti_ricambi`, `mezzi`, `app_settings`.

**RPC versioning:** `get_operational_data_version()`, `get_operational_table_versions()` per cache invalidation server-side.

## 1.11 Colli di bottiglia attuali

| Collo | Causa | Impatto |
|-------|-------|---------|
| **Fetch full-table client** | Lavorazioni, movimenti, mezzi caricati interamente in memoria | Latenza iniziale, memoria browser con migliaia di record |
| **Calcolo client-side** | Tutti i KPI aggregati in JS sul dataset completo | CPU main thread su periodi lunghi |
| **Schede lavorazione** | Ore/manodopera in JSONB `scheda_lavorazione.contenuto`, fetch separato per sezione economica | Dati parziali se schede non caricate; trust `partial` su costi |
| **Nessuna MV/reporting DB** | Solo 2 view analytics (`v_dashboard_lavorazioni_kpi`, `preventivi_billing_status`) | Nessun pre-aggregato server per report pesanti |
| **Lazy sections serial perception** | Sezioni economiche/ore fetchano dati aggiuntivi al expand | Cross analytics incompleti finché sezioni non aperte |
| **Manual entries override** | Sostituisce intero mese per completate | Incoerenza sparkline (DB-only) vs KPI card (con override) |
| **Cliente come testo** | `mezzi.cliente` non FK a `clienti_anagrafiche` | Join analytics cliente fragile, dedup difficile |
| **Integrity gate blocking** | Qualsiasi errore query blocca tutto il report | UX hard-fail vs degradazione parziale |

## 1.12 Come vengono calcolati i KPI (riepilogo formule)

### Completate nel periodo
```
COUNT(lavorazioni WHERE archived=true AND dataCompletamento IN range)
+ override report_manual_entries.completed_count per mesi interi
```
`dataCompletamento` = `data_uscita` OR `archived_at`.

### Ingressi nel periodo
```
COUNT(lavorazioni WHERE data_ingresso IN range) — attive + storico
```

### Tempo medio chiusura
```
AVG(days(data_ingresso → dataCompletamento)) per completate IN range
```

### Costi manutenzione
```
SUM(movimenti_uscita.qty × costo_acquisto) + SUM(schede.addetti.ore × app_settings.costo_orario)
```

### Disponibilità flotta (proxy)
```
(mezzi_senza_lav_attiva / mezzi_totali) × 100
```

### Capitale immobilizzato
```
SUM(quantita × prezzo_fornitore_originale) — snapshot istantaneo
```

### Fatturato periodo
```
SUM(invoices.totale WHERE status NOT IN (bozza, da_verificare, annullata) AND data_emissione IN range)
```

---

# FASE 2 — STATISTICHE ATTUALI

Per ogni statistica: nome, descrizione, calcolo, tabelle/campi, query, visualizzazione, confronto periodo, utilità, problemi.

## 2.1 LAVORAZIONI

### KPI unificati (strip esecutiva / `ReportUnifiedKpiGrid`)

#### Carico periodo (`lav-periodo`)
| Campo | Valore |
|-------|--------|
| **Descrizione** | Lavorazioni con data ingresso nel periodo |
| **Calcolo** | `countOpenedInRange(attive + storico)` dove `data_ingresso ∈ range` |
| **Tabelle** | `lavorazioni.data_ingresso`, `stato`, `archived`, `deleted_at` |
| **Query** | `useReportLavorazioniQuery` → client filter |
| **Visualizzazione** | CARD + sparkline 7gg (solo completate DB, no manual override) |
| **Confronto** | Sì — delta assoluto e % su ingressi |
| **Utilità** | Alta — misura domanda/carico officina |
| **Problemi** | Sparkline non allineata a KPI se manual override attivo |

#### Chiusure periodo (`lav-chiusi`)
| Campo | Valore |
|-------|--------|
| **Descrizione** | Completate archiviate nel periodo |
| **Calcolo** | `semanticIndex.completateTotal(range)` — archived + dataCompletamento in range + manual month override |
| **Tabelle** | `lavorazioni.archived`, `data_uscita`, `archived_at`, `report_manual_entries` |
| **Visualizzazione** | CARD |
| **Confronto** | Sì |
| **Utilità** | Alta — throughput officina |
| **Problemi** | Override manuale sostituisce mese intero (non giornaliero) |

#### Saldo backlog periodo (`lav-saldo-periodo`)
| Campo | Valore |
|-------|--------|
| **Calcolo** | `openedInPeriod − completedInPeriod` |
| **Visualizzazione** | CARD (hero) |
| **Confronto** | No |
| **Utilità** | Media — indica accumulo/smaltimento |
| **Problemi** | Non è backlog reale (quello è snapshot `lav-aperti`) |

#### Media chiusure/settimana (`lav-media-settimanale`)
| Campo | Valore |
|-------|--------|
| **Calcolo** | SUM completate settimanali ÷ N settimane calendario nel range |
| **Tabelle** | completate + manual entries (split equo su settimane del mese) |
| **Visualizzazione** | CARD |
| **Confronto** | Sì |
| **Utilità** | Alta per capacity planning |
| **Problemi** | Settimane parziali a inizio/fine periodo distorcono media |

#### Interventi aperti (`lav-aperti`)
| Campo | Valore |
|-------|--------|
| **Calcolo** | COUNT(`archived=false`) |
| **Visualizzazione** | CARD |
| **Confronto** | No (snapshot) |
| **Utilità** | Alta — WIP corrente |
| **Problemi** | Non filtrato per periodo |

#### Tempo medio chiusura (`lav-tempo`)
| Campo | Valore |
|-------|--------|
| **Calcolo** | AVG giorni(`data_ingresso` → `dataCompletamento`) per completate in range |
| **Visualizzazione** | CARD |
| **Confronto** | Sì (invert: lower is better) |
| **Utilità** | Alta — efficienza ciclo |
| **Problemi** | Sensibile a outlier; non distingue priorità/stato |

### KPI dominio (`buildOperationalAnalytics`)

| Nome | ID | Confronto | Utilità | Problemi |
|------|-----|-----------|---------|----------|
| Aperte | `lav_open` | No | Alta | Duplica `lav-aperti` |
| Completate | `lav_completed` | Sì | Alta | **Deprecated** — duplica `lav-chiusi` |
| Archiviate | `lav_archived` | No | Bassa | Snapshot totale storico, non periodo |
| Annullate | `lav_cancelled` | Sì | Media | `stato=annullata` + `data_ingresso OR created_at` in range |
| Backlog | `lav_backlog` | No | Alta | Duplica `lav-aperti` |
| Tempo medio chiusura | `lav_avg_close` | Sì | Alta | **Deprecated** — duplica `lav-tempo` |
| Oltre SLA | `lav_late_sla` | No | Alta | Soglia fissa **14 giorni** (`KPI_OPEN_LATE_DAYS_THRESHOLD`) |
| Clienti serviti | `lav_clients` | Sì | Media | **Deprecated** — duplica `clienti` in sezione CLIENTI |

### Grafici e tabelle LAVORAZIONI

| Nome | Calcolo | Visualizzazione | Confronto | Utilità | Problemi |
|------|---------|-----------------|-----------|---------|----------|
| Lavorazioni per mese | Completate mensili anno selezionato | BARRE + TABELLA | No | Alta | Anno singolo, non multi-anno |
| Heatmap annuale / previsione | Year matrix 12 mesi × anni | MATRICE | No | Alta | Forecast euristico, non ML |
| Executive strip | Testo `"{closed} chiusure · {open} aperti · {N} alert"` | Testo | No | Media | Non cliccabile/drill-down |

### Alert operativi (in strip/performance)

| Alert | Calcolo | Soglia |
|-------|---------|--------|
| Open-late | Aperte con giorni da ingresso > soglia | 14 giorni |
| Sotto-scorta | Ricambi con qty < scortaMinima | da `meta.scortaMinima` |
| Recidiva | ≥2 chiusure stesso mezzo in finestra | 30 giorni (`KPI_RECIDIVA_WINDOW_DAYS`) |
| Guasti-alta | Mezzi con `frequenzaGuastiDaInterventi = ALTA` | Regex su tipo/descrizione interventi |

---

## 2.2 CLIENTI E MEZZI

#### Clienti nel periodo (`clienti`)
| Campo | Valore |
|-------|--------|
| **Calcolo** | DISTINCT `mezzi.cliente` con ingresso OR chiusura nel periodo |
| **Tabelle** | `lavorazioni` + `mezzi.cliente` |
| **Visualizzazione** | CARD |
| **Confronto** | Sì |
| **Utilità** | Alta |
| **Problemi** | Cliente è testo libero, non FK anagrafica |

#### Mezzi in officina (`flotta-officina`)
| Campo | Valore |
|-------|--------|
| **Calcolo** | COUNT mezzi con ≥1 lavorazione non archiviata |
| **Visualizzazione** | CARD |
| **Confronto** | No (proxy snapshot) |
| **Utilità** | Media |
| **Problemi** | Proxy — non distingue mezzo vs attrezzatura target |

#### Mezzi in anagrafica (`mezzi`)
| Campo | Valore |
|-------|--------|
| **Calcolo** | COUNT(`mezzi`) |
| **Visualizzazione** | CARD compact |
| **Confronto** | No |
| **Utilità** | Bassa come KPI periodo |
| **Problemi** | Non correlato al periodo |

#### Capitale immobilizzato (`cap`)
| Campo | Valore |
|-------|--------|
| **Calcolo** | SUM(`prezzoFornitoreOriginale × quantita`) — snapshot |
| **Tabelle** | `magazzino_ricambi` |
| **Visualizzazione** | CARD (in sezione clienti_mezzi per partition UI) |
| **Confronto** | Parziale — solo Δ capitale nel periodo, non snapshot |
| **Utilità** | Alta per CFO |
| **Problemi** | Posizionato in sezione sbagliata (warehouse KPI in clienti) |

### Fleet panel (`KpiPerformanceFleet`)

| Statistica | Calcolo | Viz | Confronto | Utilità | Problemi |
|------------|---------|-----|-----------|---------|----------|
| Disponibilità per cliente | `(mezziOperativi/totalMezzi)×100` per cliente | TABELLA | No | Alta | Proxy — "operativo" = no lav aperta |
| Guasti per tipo attrezzatura | COUNT interventi match regex guasto/avaria/fermo | Lista | No | Media | Regex fragile su testo libero |
| Tempo medio fermo | AVG giorni fermo per mezzo su completate in range | Testo | No | Alta | Dipende da date ingresso/uscita |
| Mezzi frequenza guasti alta | Heuristic `frequenzaGuastiDaInterventi` | TABELLA | No | Alta | Non usa km/ore |

### Classifiche operative

| Nome | Calcolo | Viz | Confronto |
|------|---------|-----|-----------|
| Top mezzi | COUNT completate per mezzo in range | TABELLA `top-mezzi` | Sì (row delta) |
| Top clienti (interventi) | COUNT completate per cliente in range | TABELLA `top-clienti-interventi` | Sì |

**Duplicazioni:** top clienti interventi vs top clienti fatturato (sezione economica) misurano cose diverse ma label simile.

---

## 2.3 MAGAZZINO E RICAMBI

#### Ricambi sotto scorta (`scorta` / `mag_critical`)
| Campo | Valore |
|-------|--------|
| **Calcolo** | COUNT dove `quantita < meta.scortaMinima` (e min > 0) |
| **Confronto** | No (snapshot) |
| **Utilità** | Alta |
| **Problemi** | Duplicato in unified e domain grid |

#### Ricambi utilizzati (`ric-usati` / `mag_parts_qty`)
| Campo | Valore |
|-------|--------|
| **Calcolo** | SUM uscite qty da mag log in range (`conta_statistiche=true`) |
| **Tabelle** | `movimenti_ricambi` |
| **Confronto** | Sì |
| **Utilità** | Alta |

#### Valore movimentato (`mag_movement_value`)
| Campo | Valore |
|-------|--------|
| **Calcolo** | SUM(`uscite × prezzoFornitoreOriginale`) |
| **Confronto** | Sì |
| **Utilità** | Alta |
| **Problemi** | Usa costo acquisto, non prezzo vendita |

#### Ordini fornitori (`mag_orders`)
| Campo | Valore |
|-------|--------|
| **Calcolo** | COUNT ordini con `data_ordine` in range, `status ≠ annullato` |
| **Tabelle** | `ordini_fornitori` |
| **Confronto** | Sì |
| **Utilità** | Media |

### Grafici/tabelle MAGAZZINO

| Nome | Viz | Confronto | Note |
|------|-----|-----------|------|
| Movimenti netti mensili | BARRE | No | Entrate + uscite per mese |
| Movimenti mensili matrix | MATRICE | No | Entrate/uscite/Δ capitale |
| Consumo ricambi ranking | Sezione embed | No | Da `buildRicambiConsumoRanking` |
| Top ricambi | TABELLA | Sì (delta uscite) | |

---

## 2.4 ORE LAVORATE

#### Ore totali (`ore_total`)
| Campo | Valore |
|-------|--------|
| **Calcolo** | SUM(`ore_ordinarie + ore_straordinarie`) per `work_date` in range |
| **Tabelle** | `dipendenti_timesheet_entries` |
| **Hook** | `useReportTimesheetKpi` (lazy) |
| **Confronto** | Sì |
| **Utilità** | Alta |
| **Problemi** | Non collegato a lavorazioni specifiche (timesheet separato da schede) |

#### Media ore/intervento (`ore_per_job`)
| Campo | Valore |
|-------|--------|
| **Calcolo** | `totalHours / completedInPeriod` |
| **Confronto** | Sì |
| **Utilità** | Media |
| **Problemi** | Denominatore = chiusure, numeratore = timesheet globale — mismatch concettuale |

#### Team timesheet module
| Campo | Valore |
|-------|--------|
| **Visualizzazione** | Modulo embed completo |
| **Dati** | Per dipendente, per giorno, assenze, straordinari |
| **Confronto** | N/A a livello modulo |

**Dato nascosto:** `manodoperaCost` = SUM ore schede × `app_settings.costo_orario` — usato in economici/cross, non mostrato in sezione ore.

---

## 2.5 DATI ECONOMICI

#### Costi manutenzione (`cost-tot`)
| Campo | Valore |
|-------|--------|
| **Calcolo** | `sumRicambiCostFromMagLog + sumManodoperaCostFromSchede` |
| **Trust** | `partial` (schede potrebbero non essere caricate) |
| **Confronto** | Sì (invert) |
| **Utilità** | Alta |
| **Problemi** | Manodopera dipende da schede caricate client-side |

#### Preventivi (`eco_preventivi`)
| Calcolo | COUNT + SUM totale, `stato ≠ bozza`, data = `dataCreazione || aggiornatoAt` |
| **Confronto** | Sì |

#### Preventivi approvati (`eco_preventivi_approvati`)
| Calcolo | COUNT `stato ∈ {approvato, convertito}` |
| **Confronto** | Sì |

#### Fatturato periodo (`eco_invoices`)
| Calcolo | COUNT emesse + SUM totale, esclude bozza/da_verificare/annullata |
| **Tabelle** | `invoices.data_emissione`, `totale`, `status` |
| **Confronto** | Sì |

#### DDT (`eco_ddt`)
| Calcolo | COUNT documenti in range |
| **Confronto** | Sì |

#### Valore medio intervento (`eco_valore_medio_intervento`)
| Calcolo | `fatturato / completedInPeriod` |
| **Confronto** | Sì |
| **Problemi** | Mix fatturato (emissione) vs chiusure (completamento) — date diverse |

#### Margine operativo stimato (`eco_margine_operativo_stimato`)
| Calcolo | `fatturato − (manodoperaCost + movementValue)` |
| **Confronto** | No |
| **Utilità** | Alta se dati completi |
| **Problemi** | Stima grossolana, no costi indiretti |

### Sub-KPI fatturazione (calcolati, non sempre mostrati)
- `emesse`, `scadute`, `daIncassare` da `buildInvoicePeriodKpi`

### Grafici/tabelle ECONOMICI

| Nome | Viz | Confronto |
|------|-----|-----------|
| Fatturato mensile | GRAFICO LINEE | No |
| Top clienti per fatturato | TABELLA | No |

### NON montato in UI (ma calcolato)
- `KpiPerformanceEconomic`: top mezzi per costo, componenti più sostituiti — **esiste nel model, non renderizzato**

---

## 2.6 ANALISI TRASVERSALI (incrociate)

Tutti **derived**, richiedono sezioni caricate. **Nessun confronto periodo.**

| Nome | ID | Formula | Utilità | Problemi |
|------|-----|---------|---------|----------|
| Efficienza officina | `cross_efficiency` | `completedInPeriod / totalHours` | Alta | Mismatch timesheet vs schede |
| Ricambi/intervento | `cross_parts_job` | `partsUsedQty / completedInPeriod` | Alta | — |
| Costo medio lavorazione | `cross_cost_job` | `(movementValue + manodoperaCost) / completed` | Alta | Trust partial |
| Valore/ora | `cross_value_hour` | `invoicesBilled / totalHours` | Alta | Date mismatch fatture vs ore |

---

## 2.7 GRAFICI KPI (sezione separata)

Grafici multi-serie configurabili dall'utente, salvati in `report_saved_kpi_charts`.

| Metrica plottabile | Provider | Granularità |
|-------------------|----------|-------------|
| `lav-periodo`, `lav-chiusi`, `lav-media-settimanale` | lavorazioni | day/week/month |
| `ric-usati` | magazzino | week/month |
| `cost-tot`, `eco_invoices` | economici | month |
| `ore_total` | ore | month |

**Modi:** indexed, absolute, dual-axis.

---

## 2.8 ANALISI IA

**Oggi:** nessun KPI numerico nel registry. Sintesi strutturata via Gemini (`POST /api/report/analysis`). Input: context builder da snapshot periodo + performance model + tops + diario operativo.

### Flusso attuale

```
ReportAnalyticsView
  → buildReportAnalysisContext (KPI aggregati, no dump grezzo)
  → POST /api/report/analysis (Gemini + rate limit + cache fingerprint)
  → ReportAnalysisOutput (schema Zod strutturato)
```

### Input context oggi (`build-report-analysis-context.ts`)

| Blocco | Contenuto |
|--------|-----------|
| `meta` | preset, compareMode, periodStart/End, compareStart/End |
| `integrity` | status, findingCount, manualEntryCount, queryErrors |
| `executive` | chiusure, aperte, tempo medio, mezzi officina, costi manutenzione |
| `trends` | chiusure mensili (max 12), guasti euristici mensili |
| `fleet` | disponibilità per cliente (max 12), guasti per tipo, mezzi alta frequenza |
| `alerts` | alert operativi da performance model (max 16) |
| `periodKpis` | card KPI periodo (max 12) |
| `tops` | top 5 mezzi/clienti/ricambi |
| `compareDetail` | ingressi/chiusure cur vs prev |
| `operationalDiary` | voci `operational_diary_entries` nel periodo (max 62, 400 char/voce) |

### Output strutturato oggi (`report-analysis-schema.ts`)

| Campo output | Scopo |
|--------------|-------|
| `executiveSummary` | Sintesi esecutiva (max 1200 char) |
| `kpiPrincipali` | 1-12 KPI con osservazione |
| `anomalieRilevate` | fino a 10, con gravità e confidenza |
| `trendPositivi` | fino a 10 |
| `criticita` | fino a 10 (warning/critical) |
| `suggerimentiOperativi` | fino a 10 con priorità e impatto atteso |
| `prioritaImmediate` | fino a 8 azioni con scadenza |
| `valutazioneGenerale` | giudizio + punteggio 1-10 |
| `dataQualityNotes` | note su dati parziali/manuali |

### Confronto periodo

| Aspetto | Stato |
|---------|-------|
| Compare nel context | Sì — `compareMode`, range confronto, `compareDetail`, delta KPI |
| Output esplicito su delta | Parziale — delegato al modello nella narrativa |

### Utilità

| Pro | Contro |
|-----|--------|
| Sintesi leggibile per direzione | Non include ancora dati economici completi (fatturato, crediti, preventivi) |
| Integra diario operativo (eventi) | Non include cross analytics V2 |
| Output strutturato e validato | Manodopera `trust: partial` — confidenza variabile |
| Cache per fingerprint | Rate limit; generazione on-demand |

### Visione V2 (documentazione — non implementata)

**Obiettivo:** report completo settimanale/mensile — panoramica aziendale **comprensibile ma non sovraccarica**, simile all'esperienza attuale ma arricchita.

| Elemento V2 | Descrizione |
|-------------|-------------|
| **Cadenza** | Preset consigliati: `questa_settimana` / `settimana_scorsa` / `questo_mese` / `mese_scorso` + confronto `prev_period` o `prev_year` |
| **Sezione UI** | `analisi_ai` resta sezione accordion dedicata (non sostituita dalla insight strip) |
| **Context arricchito** | Aggiungere al payload: fatturato, da incassare/scadute, preventivi/win rate, ore totali, cross KPI, insight strip deterministici, compliance imminenti |
| **Eventi** | `operational_diary_entries` (già presente) + alert performance + note integrità/manuali |
| **Output invariato** | Mantenere schema strutturato attuale — evitare wall of text |
| **Complemento** | Insight strip (3-5 righe deterministiche) sopra le sezioni; ANALISI IA = report approfondito su richiesta |
| **Export** | PDF bundle include sintesi AI se generata nel periodo |

### Dati disponibili ma NON ancora nel context AI

| Dato | Tabella/fonte | Utilità per narrativa |
|------|---------------|----------------------|
| Fatturato / crediti | `invoices` | Andamento economico |
| Preventivi / win rate | `preventivi` | Pipeline commerciale |
| Ore team | `dipendenti_timesheet_entries` | Produttività |
| Cross KPI | derived DTO | Efficienza, valore/ora |
| AR aging | `customer_open_items` | Rischio cash |
| Compliance scadenze | `asset_compliance_rules` | Rischi futuri |
| Sotto scorta / top ricambi | magazzino | Supply risk |

---

## 2.9 Riepilogo problemi trasversali statistiche attuali

| Problema | Statistiche coinvolte |
|----------|----------------------|
| **Duplicazioni** | lav_open/aperti, lav_completed/chiusi, lav_avg_close/tempo, lav_clients/clienti, scorta/mag_critical |
| **Ridondanti** | Archiviate (snapshot), Mezzi in anagrafica |
| **Poco significative** | Saldo backlog periodo (confonde con WIP) |
| **Mancanti** | Margine per cliente, DSO, fill rate preventivi, lead time ordini, compliance scadenze, produttività per operatore, costo per km |
| **Trust basso** | Costi manutenzione, cross metrics con manodopera |
| **Non in UI** | KpiPerformanceEconomic tables, asset lifecycle KPIs (feature-flagged) |

---

# FASE 3 — MODELLO DATI

**Fonti:** 224 migrazioni Supabase, `src/types/supabase-tables.ts` (tipi manuali, no `database.types.ts` generato).

**Nota multi-tenant:** `company_id` presente solo su moduli recenti (document_capture, inventory_documents, notifications v4). **Core operativo è single-tenant.**

## 3.1 Enumerazioni PostgreSQL

| Enum | Valori |
|------|--------|
| `tipo_scheda_lavorazione` | ingresso, interventi, ricambi |
| `tipo_movimento_ricambio` | entrata, uscita |
| `categoria_documento` | manuale, listino, catalogo, certificazione, altro |
| `asset_kind` | mezzo, attrezzatura |
| `compliance_rule_kind` | revisione, tagliando, assicurazione, bollo, verifica_attrezzatura, collaudo, altro |
| `compliance_trigger_kind` | date_interval, fixed_date, km_interval, one_shot |
| `mileage_source` | scheda, manual, import, correction |
| `inventory_document_status` | UPLOADED → APPLIED/FAILED (workflow) |
| `inventory_line_match_status` | FOUND, SUGGESTED, NEW_ITEM, REJECTED |

**Convertiti a TEXT (app_settings-driven):** `stato_lavorazione`, `priorita_lavorazione`.

## 3.2 Pattern trasversali

| Pattern | Tabelle | Note analytics |
|---------|---------|----------------|
| `created_at`, `updated_at` | Quasi tutte | Timeline, trend, velocity |
| `created_by`, `updated_by` | Lavorazioni, mezzi, fatture, ordini | Produttività operatore |
| `deleted_at` | lavorazioni, report_manual_entries, operational_diary, maintenance_plans, document_capture | Esclusione da metriche |
| `archived`, `archived_at` | lavorazioni | Completamento vs stato |
| `entity_key` | mezzi, magazzino_ricambi, clienti_anagrafiche | Dedup/join fuzzy |
| `meta` (jsonb) | mezzi, magazzino, preventivi, invoices, ordini | Campi estensibili non tipizzati |
| `log_modifiche` | Polimorfico | Audit trail completo |
| `conta_statistiche` | movimenti_ricambi | Esclusione rettifiche inventario |

## 3.3 Dominio LAVORAZIONI

### `lavorazioni`
| Campo | Tipo | Analytics |
|-------|------|-----------|
| id | uuid PK | Join key |
| mezzo_id | FK → mezzi | Per mezzo/cliente |
| attrezzatura_id | FK → attrezzature | Target intervento |
| target_type | telaio/attrezzatura | Segmentazione |
| codice | text | Identificazione umana YY-NNNN |
| stato | text | Distribuzione stati, funnel |
| priorita | text | Urgenza, SLA |
| data_ingresso | date | Lead time, carico |
| data_uscita | date | Chiusura |
| archived, archived_at | bool, timestamptz | Completamento |
| deleted_at | timestamptz | Esclusione |
| note | text | NLP futuro |
| created_by, updated_by | FK profiles | Operatore |
| created_at, updated_at | timestamptz | Velocity |

**FK:** mezzi (RESTRICT), attrezzature, profiles  
**RPC:** `soft_delete_lavorazione`, `list_lavorazioni_paginated`, `archive_lavorazione_client_portal`  
**View:** `lavorazioni_clienti`, `v_dashboard_lavorazioni_kpi`

### `scheda_lavorazione`
| Campo | Analytics |
|-------|-----------|
| lavorazione_id | FK |
| tipo | ingresso/interventi/ricambi |
| contenuto | JSONB — **ore, addetti, voci lavoro, ricambi, km, anomalie** |
| created_at, updated_at | Freschezza dati |

**Struttura contenuto (types/schede.ts):**
- Ingresso: cliente, cantiere, km, VIN, targa, descrizioneAnomalia, oreLavoro, livelloCarburante, richiedente
- Lavorazioni: righe con dataLavorazione, lavorazioniEffettuate, addettiAssegnati[{addetto, oreImpiegate}]
- Ricambi: righe con ricambioId, quantita, addetto, dataUtilizzo, scaricoMagazzinoApplicato

### `lavorazione_documents`
PDF allegati: preventivo_upload, ddt

### `report_manual_entries`
Override mensile `completed_count` per storico pre-digitale.

## 3.4 Dominio CLIENTI

### `clienti_anagrafiche` + `clienti_sedi` + `clienti_contatti`
Anagrafica strutturata: P.IVA, SDI, sedi operative/legali, contatti tipizzati.

### Link debole
- `mezzi.cliente` = testo label (NON FK)
- `billing_customers.cliente_label` = testo
- `profiles.cliente_ref` = portale cliente

## 3.5 Dominio MEZZI / ASSET LIFECYCLE

### `mezzi`
targa, numero_scuderia, anno, cliente, utilizzatore, marca/modello/tipo telaio, VIN (telaio_num_norm unique), km, note, meta, entity_key

### `attrezzature`
FK mezzo_id: marca, modello, tipo_attrezzatura, matricola, portata, anno

### Asset lifecycle (analytics-ready, **non usato in report oggi**)
| Tabella | Dati |
|---------|------|
| `asset_compliance_rules` | Scadenze revisione/tagliando/assicurazione/bollo |
| `asset_compliance_records` | Storico adempimenti, esito, km |
| `asset_assignment_history` | Storico installazione attrezzature su mezzi |
| `asset_mileage_readings` | Letture km con source |
| `maintenance_plans` | Piani manutenzione per ore |
| `vehicle_maintenance_services` | Servizi eseguiti, ore_at_service |
| `vehicle_maintenance_service_parts` | Ricambi per servizio |

**View:** `asset_timeline_projection`

## 3.6 Dominio MAGAZZINO / RICAMBI

### `magazzino_ricambi`
codice (unique), nome, marca, quantita, costo, prezzo_vendita, consumo_medio_mensile, meta{scortaMinima, categoria, fornitore, note}, entity_key

### `movimenti_ricambi`
ricambio_id, lavorazione_id (nullable), tipo, quantita, conta_statistiche, inventory_document_id, created_at, created_by

### Inventory receiving (`inventory_documents` + lines)
Workflow DDT fornitore con AI matching, company-scoped.

### QR/Labels (`inventory_qr_tokens`, `inventory_qr_scans`, `inventory_label_events`)
Tracciabilità fisica — non in report.

## 3.7 Dominio ORE

### `dipendenti_timesheet_entries`
dipendente_id, work_date, ore_ordinarie, ore_straordinarie, assenza, motivo_assenza, ore_assenza, tipo_assenza_id/label, snapshot nomi

### `dipendenti_timesheet_employees`
Registry dipendenti indipendente da settings addetti

### Ore su schede (JSONB)
Per-lavorazione, per-addetto, per-riga — fonte alternativa al timesheet

## 3.8 Dominio PREVENTIVI

### `preventivi`
mezzo_id, lavorazione_id, cliente, totale, dettagli{numero, righe, stato, date...}, created_at

**View:** `preventivi_billing_status` (fatturato/residuo/stato_fatturazione)  
**View:** `preventivo_ddt_fulfillment` (qty preventivo vs consegnata)

## 3.9 Dominio FATTURAZIONE

### `invoices` — assi multipli
| Asse | Valori |
|------|--------|
| status (legacy) | bozza, emessa, pagata, scaduta, annullata... |
| document_status | bozza, approvata, emessa, annullata |
| payment_status | non_pagata, parzialmente_pagata, pagata, scaduta |
| sdi_status | non_applicabile → scartata |
| accounting_status | da_registrare → chiusa |
| document_type | fattura, nota_credito, proforma |

Importi: imponibile, iva, totale, pagato, residuo  
Date: data_emissione, data_scadenza, sent_to_customer_at, approved_at, closed_at

### Child tables
`invoice_rows`, `invoice_links`, `invoice_payments`, `customer_open_items`, `customer_payments`, `payment_allocations`, `invoice_events`, `invoice_relations`, `billing_customers`

## 3.10 Dominio ORDINI / DDT

### `ordini_fornitori` + righe
Status workflow, fornitore, totali, FK lavorazione/preventivo/scheda

### `ddt_documents` + rows + links
Status bozza→consegnato, FK preventivo/lavorazione/mezzo, partial delivery

## 3.11 Dominio UTENTI / RBAC

`profiles`, `roles`, `permissions`, `role_permissions`, `user_roles`, `user_permissions_v2`, `role_page_access`, `auth_logs`

## 3.12 Dominio DOCUMENTI / NOTIFICHE / ALTRO

| Dominio | Tabelle chiave |
|---------|----------------|
| Documenti catalogo | `documenti` |
| Document capture AI | `document_capture` + 7 child |
| Notifiche v4 | `notifications`, `notification_user_state`, `delivery_queue` |
| Diario operativo | `operational_diary_entries` |
| Health score | `health_score_runs` |
| Log modifiche | `log_modifiche` |
| Settings | `app_settings`, `app_settings_audit` |
| Contabilità | `accounting_entries`, `accounting_entry_lines` |
| Import/export | `import_files`, `export_jobs`, telemetry |
| Workshop schedule | `workshop_schedule_events`, history |
| TKB interventi | `interventi_*` (6 tabelle knowledge base) |

## 3.13 RPC e View analytics DB

| Oggetto | Scopo |
|---------|-------|
| `get_operational_data_version()` | Cache invalidation |
| `get_operational_table_versions()` | Per-table version map |
| `list_lavorazioni_paginated` | Paginazione lavorazioni |
| `v_dashboard_lavorazioni_kpi` | attive, urgenti, entrati_oggi |
| `preventivi_billing_status` | Stato fatturazione preventivi |
| `preventivo_ddt_fulfillment` | Evasione DDT |
| `payment_allocations_expanded` | Allocazioni pagamenti |
| `asset_timeline_projection` | Timeline compliance/manutenzione |
| Reconciliation reports | invoice/payment/customer balance audit |

---

# FASE 4 — DATI DISPONIBILI PER DOMINIO

Elenco esaustivo di ciò che il gestionale **possiede** (non solo ciò che il report mostra oggi).

## 4.1 LAVORAZIONI

| Dato | Fonte | In report oggi? |
|------|-------|-----------------|
| Codice umano (YY-NNNN) | lavorazioni.codice | Parziale (liste) |
| Stato workflow | lavorazioni.stato | Parziale (annullate) |
| Priorità | lavorazioni.priorita | No (solo alert urgenti dashboard) |
| Data ingresso | lavorazioni.data_ingresso | Sì |
| Data uscita | lavorazioni.data_uscita | Sì (chiusura) |
| Data archiviazione | lavorazioni.archived_at | Sì (fallback chiusura) |
| Target tipo (telaio/attrezzatura) | lavorazioni.target_type | No |
| Attrezzatura specifica | lavorazioni.attrezzatura_id | No |
| Note | lavorazioni.note | No |
| Operatore creazione/modifica | created_by, updated_by | No |
| Timestamp creazione/modifica | created_at, updated_at | Parziale (annullate) |
| Soft delete | deleted_at | Escluso da metriche |
| Cliente (via mezzo) | mezzi.cliente | Sì |
| Mezzo | mezzo_id → mezzi | Sì |
| KM al ingresso | scheda ingresso.campi.km | No |
| Descrizione anomalia | scheda ingresso | No |
| Livello carburante | scheda ingresso | No |
| Cantiere | scheda ingresso | No |
| Utilizzatore | scheda ingresso / mezzi | No |
| Richiedente + telefono | scheda ingresso | No |
| Ore lavoro macchina | scheda ingresso.oreLavoro | No |
| Righe intervento (testo) | scheda lavorazioni.righe | No (solo regex guasti) |
| Ore per addetto per riga | scheda lavorazioni.addettiAssegnati | Parziale (costo) |
| Ricambi usati per scheda | scheda ricambi.righe | Parziale (via movimenti) |
| PDF allegati | lavorazione_documents | No |
| Preventivo collegato | preventivi.lavorazione_id | Parziale |
| Fatture collegate | invoice_rows/links | Parziale |
| DDT collegati | ddt_documents | Parziale |
| Ordini fornitore | ordini_fornitori | Parziale |
| Movimenti magazzino | movimenti_ricambi | Sì |
| Storico modifiche | log_modifiche | No |
| Override completate mensili | report_manual_entries | Sì |

## 4.2 CLIENTI

| Dato | Fonte | In report? |
|------|-------|------------|
| Nome display | clienti_anagrafiche | No |
| Ragione sociale, P.IVA, SDI | clienti_anagrafiche | No |
| Sedi operative/legali | clienti_sedi | No |
| Contatti (email, PEC, tel) | clienti_contatti | No |
| Label su mezzi | mezzi.cliente | Sì |
| Profilo billing | billing_customers | Parziale (fatture) |
| Portale cliente | profiles.cliente_ref | No |
| Disponibilità flotta % | derivato mezzi+lav | Sì |
| Fatturato | invoices | Sì (top) |
| Open items / insoluti | customer_open_items | No |
| Pagamenti | customer_payments | No |

## 4.3 MEZZI

| Dato | Fonte | In report? |
|------|-------|------------|
| Targa, scuderia, anno | mezzi | No |
| Marca/modello/tipo telaio | mezzi | Parziale (label) |
| VIN | mezzi.telaio_num | No |
| KM attuale | mezzi.km | No |
| Attrezzature installate | attrezzature | Parziale (tipo) |
| Storico assegnazioni attrezzature | asset_assignment_history | No |
| Letture km storiche | asset_mileage_readings | No |
| Compliance scadenze | asset_compliance_rules/records | No |
| Piani manutenzione | maintenance_plans | No |
| Servizi manutenzione eseguiti | vehicle_maintenance_services | No |
| In officina (proxy) | derivato | Sì |
| Frequenza guasti | derivato regex | Sì |
| Tempo fermo medio | derivato date | Sì |
| Top per interventi | derivato | Sì |
| Top per costo | calcolato, non in UI | No |
| Documenti tecnici | documenti | No |

## 4.4 RICAMBI / MAGAZZINO

| Dato | Fonte | In report? |
|------|-------|------------|
| Codice, nome, marca | magazzino_ricambi | Parziale (top) |
| Quantità giacenza | quantita | Sì (sotto scorta) |
| Costo acquisto | costo | Sì (valore movimentato) |
| Prezzo vendita | prezzo_vendita | No |
| Consumo medio mensile | consumo_medio_mensile | No |
| Scorta minima | meta.scortaMinima | Sì |
| Categoria, fornitore | meta | No |
| Movimenti entrata/uscita | movimenti_ricambi | Sì |
| Flag conta_statistiche | movimenti | Sì (filtro) |
| Lavorazione collegata | movimenti.lavorazione_id | Parziale |
| Capitale immobilizzato | derivato | Sì |
| DDT ricevimento inventario | inventory_documents | No |
| QR scan history | inventory_qr_scans | No |
| Ordini fornitore per ricambio | ordini_fornitori_righe | No |
| Componenti map | ricambi_componenti_map | No |

## 4.5 ORE

| Dato | Fonte | In report? |
|------|-------|------------|
| Ore ordinarie/straordinarie giornaliere | timesheet_entries | Sì |
| Assenze (tipo, ore) | timesheet_entries | Parziale (modulo) |
| Dipendente | timesheet_employees | Parziale |
| Ore per addetto su scheda | scheda lavorazioni | Parziale (costo) |
| Ore macchina ingresso | scheda ingresso | No |
| Costo orario settings | app_settings | Parziale (costo) |
| Ore piano manutenzione | maintenance_plans.interval_ore | No |

## 4.6 PREVENTIVI

| Dato | Fonte | In report? |
|------|-------|------------|
| Numero (YY-NNNN/N o /M) | dettagli.numero | No |
| Stato (bozza, approvato, convertito...) | dettagli.stato | Parziale |
| Totale | totale | Sì |
| Righe dettaglio | dettagli.righe | No |
| Data creazione/aggiornamento | timestamps | Sì (filtro) |
| Mezzo, cliente, lavorazione | FK | Parziale |
| Stato fatturazione | view preventivi_billing_status | No |
| Evasione DDT | view preventivo_ddt_fulfillment | No |
| Conversion rate | derivabile | No |

## 4.7 FATTURE

| Dato | Fonte | In report? |
|------|-------|------------|
| Numero, anno | invoices | No |
| Tutti gli assi status | invoices | Parziale |
| Imponibile, IVA, totale | invoices | Parziale (totale) |
| Pagato, residuo | invoices | Parziale (daIncassare) |
| Data emissione/scadenza | invoices | Parziale |
| Cliente (label + snapshot) | invoices | Sì (top) |
| Righe per tipo | invoice_rows | No |
| Link a preventivo/lavorazione/mezzo/ricambio | invoice_links | No |
| Pagamenti | invoice_payments, customer_payments | No |
| Allocazioni | payment_allocations | No |
| Eventi (audit stream) | invoice_events | No |
| Note credito/relazioni | invoice_relations | No |
| SDI status | invoices.sdi_status | No |
| Contabilità | accounting_entries | No |

## 4.8 ORDINI FORNITORI

| Dato | Fonte | In report? |
|------|-------|------------|
| Numero, status workflow | ordini_fornitori | Parziale (count) |
| Fornitore | fornitore_label/snapshot | No |
| Totali (imponibile, IVA, totale) | ordini_fornitori | No |
| Righe (ricambio, qty, prezzo) | ordini_fornitori_righe | No |
| Lead time (ordine→ricevuto) | status + timestamps | No |
| Collegamento lavorazione | lavorazione_id | No |

## 4.9 DDT

| Dato | Fonte | In report? |
|------|-------|------------|
| Status workflow | ddt_documents | No |
| Date documento/consegna | ddt_documents | Parziale (count) |
| Righe e quantità | ddt_rows | No |
| Evasione vs preventivo | view | No |
| Mezzo/cliente snapshot | ddt_documents | No |

## 4.10 UTENTI

| Dato | Fonte | In report? |
|------|-------|------------|
| Profilo, ruolo | profiles | No |
| Permessi effettivi | RBAC tables | No |
| Auth logs (login/logout) | auth_logs | No |
| Operatore su entità | created_by su varie | No |

## 4.11 DOCUMENTI

| Dato | Fonte | In report? |
|------|-------|------------|
| Catalogo per mezzo | documenti | No |
| Document capture AI | document_capture | No |
| PDF schede generate | scheda_pdf_generations | No |

## 4.12 NOTIFICHE

| Dato | Fonte | In report? |
|------|-------|------------|
| Tipo, priorità, scope | notification_type_registry | No |
| Inbox, read/dismiss | notifications + user_state | No |
| Delivery tracking | delivery_queue | No |
| Preferenze push | notification_preferences | No |

## 4.13 ALTRO

| Dato | Fonte | In report? |
|------|-------|------------|
| Diario operativo giornaliero | operational_diary_entries | No (solo AI context) |
| Health score runs | health_score_runs | No |
| Workshop schedule | workshop_schedule_events | No (calendar service separato) |
| Log modifiche globali | log_modifiche | No |
| Settings (stati, priorità, costo orario) | app_settings | Parziale |
| Import/export telemetry | import_export_telemetry_daily | No |

---

# FASE 5 — ANALYTICS POSSIBILI

Per ogni dato/dominio: analisi calcolabili con i dati reali disponibili.

## 5.1 LAVORAZIONI

| Dato | Analytics possibili |
|------|---------------------|
| Numero ingressi | Andamento giornaliero/settimanale/mensile, trend, crescita %, confronto periodo, media mobile, distribuzione per giorno settimana, stagionalità, forecast (serie storica sufficiente), anomalie (z-score), outlier |
| Numero chiusure | Come sopra + throughput vs capacity, completate/settimana, YoY |
| Backlog (aperte) | Snapshot trend (se storico snapshot), aging buckets (0-7, 8-14, 15-30, 30+ gg) |
| Tempo chiusura | Media, mediana, P25/P75/P90, distribuzione, trend, per priorità/stato, per tipo attrezzatura, outlier |
| Stato | Distribuzione, funnel conversione stato→stato, tempo in stato |
| Priorità | Distribuzione, tempo chiusura per priorità, SLA breach rate per priorità |
| Annullate | Rate annullamento, trend, per cliente/mezzo |
| Per cliente | Top N, Pareto 80/20, concentrazione, nuovi vs ricorrenti |
| Per mezzo | Top N, frequenza, MTBF (tempo tra interventi), MTTR (tempo riparazione) |
| Per operatore | Volume creati/gestiti, tempo medio gestione |
| Per tipo attrezzatura | Volume, tempo medio, costo medio |
| Oltre SLA | Count, %, trend, per cliente |
| Recidiva | Mezzi con interventi ripetuti, finestra configurabile |
| Saldo periodo | Accumulo vs smaltimento, trend |
| Schede — anomalie | Word cloud / top keywords (NLP), categorizzazione guasti |
| Schede — ore | Ore per intervento, per addetto, efficienza |
| Manual override | Gap storico pre-digitale vs DB |

## 5.2 CLIENTI

| Dato | Analytics |
|------|-----------|
| Clienti attivi periodo | Count, trend, nuovi clienti, churn (assenza interventi) |
| Disponibilità flotta | Per cliente, min/max/avg, sotto soglia, heatmap cliente×tempo |
| Fatturato per cliente | Top, Pareto, LTV stimato, trend |
| Insoluti/residuo | AR aging (0-30, 31-60, 61-90, 90+), DSO |
| Preventivi per cliente | Volume, valore, conversion rate |
| Costo manutenzione per cliente | Ricambi + manodopera per cliente |
| Redditività | Fatturato − costi diretti per cliente |
| Sedi/contatti | No analytics dirette (master data) |

## 5.3 MEZZI / FLOTTA

| Dato | Analytics |
|------|-----------|
| Parco mezzi | Totale, per cliente, per marca/modello, per anno |
| In officina | Snapshot, % flotta, trend, durata media sosta |
| KM | Trend km, km tra interventi, km/anno |
| Compliance | Scadenze imminenti, % conformi, ritardi adempimenti |
| Manutenzione programmata | Aderenza piani, ore tra servizi, ricambi pianificati vs effettivi |
| Affidabilità | Frequenza guasti, MTBF, classificazione ALTA/MEDIA/BASSA |
| Costo totale possesso (TCO) | Costi ricambi + manodopera + fatturato per mezzo |
| Età mezzo | Anno vs frequenza guasti, costo |
| Attrezzature | Distribuzione tipi, storico assegnazioni, rotazione |

## 5.4 MAGAZZINO / RICAMBI

| Dato | Analytics |
|------|-----------|
| Giacenza | Snapshot, valorizzazione, per categoria/fornitore |
| Sotto scorta | Count, % SKU, trend, giorni copertura (qty/consumo_medio) |
| Movimenti | Entrate/uscite/netti per periodo, per ricambio, per lavorazione |
| Consumo | Ranking, Pareto consumo, stagionalità, forecast consumo |
| Capitale immobilizzato | Totale, trend, rotazione stock (COGS/avg inventory) |
| Ordini fornitore | Volume, valore, lead time, fill rate |
| Prezzo costo vs vendita | Margine per ricambio |
| Rettifiche inventario | % movimenti con conta_statistiche=false |
| DDT ricevimento | Tempo UPLOADED→APPLIED, match rate AI |

## 5.5 ORE

| Dato | Analytics |
|------|-----------|
| Ore totali | Trend, per dipendente, ordinario vs straordinario |
| Assenze | Rate, per tipo, stagionalità |
| Ore/intervento | Media, trend, per tipo lavoro |
| Ore scheda vs timesheet | Gap analysis, reconciliazione |
| Produttività | Interventi chiusi / ore, fatturato / ore |
| Saturazione | Ore disponibili vs ore registrate |
| Costo manodopera | Trend, per cliente, per mezzo |

## 5.6 PREVENTIVI

| Dato | Analytics |
|------|-----------|
| Volume | Count, trend, per cliente/mezzo |
| Valore | SUM totale, media, distribuzione |
| Conversion funnel | Bozza → approvato → convertito → fatturato |
| Win rate | Approvati / totali |
| Tempo approvazione | Giorni bozza→approvato |
| Residuo fatturazione | Da view preventivi_billing_status |
| Evasione DDT | % qty consegnata vs preventivo |
| Righe più quotate | Top articoli/servizi |

## 5.7 FATTURAZIONE

| Dato | Analytics |
|------|-----------|
| Fatturato | Emesso, incassato, trend mensile, per cliente, per tipo riga |
| Margine | Per riga tipo (ricambio/manodopera/libera) |
| Incassi | Cash flow, giorni medi incasso (DSO) |
| Scadute | Count, valore, aging |
| Crediti | Open items, allocazioni, insoluti |
| SDI | Tasso scarto, tempi consegna |
| Note credito | Volume, motivazioni |
| Confronto preventivo→fattura | Delta valore |

## 5.8 ORDINI / DDT

| Dato | Analytics |
|------|-----------|
| Ordini | Volume, valore, per fornitore, lead time per status |
| DDT | Volume consegne, tempi consegna, evasione parziale |
| Catena approvvigionamento | Ordine → ricevimento → uscita magazzino → lavorazione |

## 5.9 TRASVERSALI (multi-dominio)

Vedi FASE 7 per elenco completo correlazioni.

---

# FASE 6 — VISUALIZZAZIONI POSSIBILI

Per ogni statistica chiave: componente raccomandato e motivazione.

## 6.1 LAVORAZIONI

| Statistica | Componente | Perché |
|------------|------------|--------|
| Carico periodo (ingressi) | **CARD** + sparkline | KPI singolo con micro-trend |
| Andamento ingressi/chiusure | **GRAFICO LINEE** (dual series) | Confronto temporale due metriche |
| Chiusure mensili | **BARRE** | Confronto mesi discreti |
| Completate vs target | **GAUGE** | Solo se target definito in settings (oggi assente) |
| Backlog aperte | **CARD** | Snapshot |
| Aging backlog | **STACKED BAR** | Composizione per fascia giorni |
| Tempo medio chiusura | **CARD** + delta compare | KPI con confronto |
| Distribuzione tempi chiusura | **BOX PLOT** | Mostra mediana e outlier |
| Heatmap annuale | **HEATMAP** | Intensità per mese×anno (già esiste) |
| Top mezzi/clienti | **TABELLA** | Ranking con drill-down |
| Stati lavorazione | **DONUT** | Composizione percentuale |
| Priorità | **STACKED BAR** | Volume per livello priorità |
| SLA breach | **CARD** + **TABELLA** dettaglio | Alert + lista interventi |
| Recidiva mezzi | **TABELLA** | Lista mezzi con count |
| Forecast chiusure | **GRAFICO LINEE** (dashed) | Estensione trend (già parziale in matrix) |
| Anomalie volume | **MATRICE** o badge su CARD | Evidenzia mesi fuori norma |

## 6.2 CLIENTI E MEZZI

| Statistica | Componente | Perché |
|------------|------------|--------|
| Clienti nel periodo | **CARD** | KPI count |
| Disponibilità per cliente | **BARRE** orizzontali | Confronto tra clienti |
| Disponibilità trend | **GRAFICO LINEE** | Se snapshot storici (oggi no — serve persistenza) |
| Mezzi in officina | **CARD** | Snapshot |
| Pareto clienti per interventi | **BARRE** + linea cumulativa | Pareto classico |
| Guasti per tipo attrezzatura | **DONUT** | Composizione |
| Frequenza guasti mezzi | **TABELLA** con semaforo | Ranking con severity |
| Tempo fermo medio | **CARD** | KPI |
| Mappa marca/modello | **TREEMAP** | Composizione parco per marca |
| Compliance scadenze | **TIMELINE** | Eventi futuri/passati (dati esistono, non in report) |
| KM trend mezzo | **GRAFICO LINEE** | Serie da asset_mileage_readings |

## 6.3 MAGAZZINO

| Statistica | Componente | Perché |
|------------|------------|--------|
| Sotto scorta | **CARD** | Alert count |
| Ricambi utilizzati | **CARD** | KPI volume |
| Movimenti mensili | **STACKED BAR** (entrate+uscite) | Composizione flussi |
| Capitale immobilizzato | **CARD** + **AREA** trend | Valore stock nel tempo |
| Top ricambi consumo | **TABELLA** / **BARRE** | Ranking |
| Giacenza per categoria | **TREEMAP** | Composizione valorizzata |
| Giorni copertura | **HEATMAP** (ricambio×mese) | Intensità rischio stockout |
| Ordini fornitore | **CARD** + **TIMELINE** status | Volume + pipeline |
| Margine ricambio | **SCATTER** (costo vs vendita) | Outlier pricing |

## 6.4 ORE

| Statistica | Componente | Perché |
|------------|------------|--------|
| Ore totali | **CARD** | KPI |
| Ore per dipendente | **BARRE** | Confronto team |
| Ordinario vs straordinario | **STACKED BAR** | Composizione |
| Assenze | **DONUT** per tipo | Composizione |
| Ore/intervento | **CARD** | KPI derivato |
| Saturazione settimanale | **HEATMAP** (dipendente×settimana) | Intensità carico |
| Timesheet dettaglio | **TABELLA** | Granularità giornaliera |

## 6.5 DATI ECONOMICI

| Statistica | Componente | Perché |
|------------|------------|--------|
| Fatturato periodo | **CARD** | KPI |
| Fatturato mensile | **GRAFICO LINEE** / **AREA** | Trend revenue |
| Preventivi | **CARD** (count · €) | Doppio valore |
| Conversion funnel | **BARRE** funnel o **SANKEY** | Flusso bozza→fatturato |
| Margine operativo | **CARD** | KPI derivato |
| Top clienti fatturato | **TABELLA** | Ranking |
| AR aging | **STACKED BAR** per fascia | Composizione crediti |
| DSO trend | **GRAFICO LINEE** | KPI finanziario |
| Costi vs ricavi | **BARRE** grouped | Confronto periodo |
| Valore medio intervento | **CARD** | KPI |
| Righe fattura per tipo | **DONUT** | Mix ricavi |

## 6.6 ANALISI TRASVERSALI

| Statistica | Componente | Perché |
|------------|------------|--------|
| Efficienza (int/ore) | **CARD** | KPI ratio |
| Ricambi/intervento | **CARD** | KPI ratio |
| Costo medio lav. | **CARD** | KPI € |
| Valore/ora | **CARD** | KPI €/h |
| Ore vs ricambi scatter | **SCATTER** (per intervento) | Correlazione |
| Costo vs fatturato per cliente | **SCATTER** | Redditività |
| Flusso preventivo→DDT→fattura | **SANKEY** | Catena valore |

---

# FASE 7 — ANALISI TRASVERSALI

Correlazioni **realmente calcolabili** con join esistenti.

## 7.1 Matrice correlazioni

| Correlazione | Dati necessari | Join path | Già in report? |
|--------------|----------------|-----------|----------------|
| Ore vs ricambi per intervento | schede + movimenti | lavorazione_id | Parziale (cross aggregate) |
| Cliente vs redditività | invoices + costi | cliente_label | No |
| Mezzo vs guasti | lavorazioni + mezzi | mezzo_id | Sì (frequenza) |
| Tempo fermo vs costo | date lav + costi | mezzo_id | No |
| Operatore vs produttività | created_by + chiusure + ore | profile_id | No |
| Marca vs affidabilità | mezzi.marca + interventi | mezzo_id | No |
| Ricambio vs frequenza | movimenti group by ricambio | ricambio_id | Parziale (top) |
| Fornitore vs tempi ordine | ordini status timeline | ordini_fornitori | No |
| Cliente vs insoluti | open_items + cliente | billing_customers | No |
| Mezzi vecchi vs costi | mezzi.anno + costi per mezzo | mezzo_id | No |
| Preventivo vs consuntivo | preventivo.totale vs invoice/movimenti | lavorazione_id | No |
| Priorità vs tempo chiusura | lavorazioni | — | No |
| Tipo attrezzatura vs costo medio | attrezzature + costi | attrezzatura_id | No |
| Stagione vs volume | data_ingresso month | — | Parziale (heatmap) |
| Straordinari vs backlog | timesheet + aperte | periodo | No |
| Scorte vs consumo | giacenza + uscite | ricambio_id | No (già consumo_medio) |
| DDT evasione vs soddisfazione cliente | fulfillment view | preventivo_id | No |
| Compliance vs fermi | compliance + lavorazioni | mezzo_id | No |
| KM vs frequenza interventi | mileage_readings + lav | mezzo_id | No |
| Assenze team vs throughput | timesheet + chiusure | periodo | No |
| Capitale immobilizzato vs rotazione | stock + uscite | — | No |
| AI diario vs KPI | operational_diary + metriche | work_date | No (solo AI) |

## 7.2 Cross metrics esistenti (da estendere)

| Metrica attuale | Estensioni possibili |
|-----------------|---------------------|
| cross_efficiency | Per cliente, per tipo attrezzatura, rolling 3 mesi |
| cross_parts_job | Per mezzo, per marca ricambio |
| cross_cost_job | Per cliente, per priorità |
| cross_value_hour | Per operatore, per cliente |

## 7.3 Catene causali analizzabili

```
Preventivo approvato → Lavorazione aperta → Ore + Ricambi → Chiusura → DDT → Fattura → Incasso
```

Ogni step ha dati per misurare:
- Lead time tra step
- Delta valore tra step
- Tasso abbandono (preventivo non convertito, lav non chiusa, fattura non pagata)

---

# FASE 8 — CONFRONTO PERIODI

## 8.1 Stato attuale

**Implementato oggi:**
- 6 modalità confronto (`ReportCompareMode`)
- Delta assoluto e % su KPI periodo (`deltaPct`, `compareBaselineValue`)
- Scaling per medie mobili (3/12/36 mesi)
- `invert` flag per metriche "lower is better" (tempo chiusura, costi)
- Row-level compare su classifiche (top mezzi/clienti/ricambi)
- Compare rows su KPI cards unificati

**NON implementato:**
- Confronto su snapshot (backlog, scorte, capitale totale)
- Confronto cross analytics
- Confronto grafici mensili (solo valori assoluti)
- Significatività statistica del delta
- Seasonal adjustment automatico
- Confronto same-weekday (es. questo martedì vs martedì scorso)

## 8.2 Miglioramenti possibili (solo con dati esistenti)

| Tecnica | Applicabilità | Dati richiesti |
|---------|-------------|----------------|
| **Delta assoluto** | Tutte metriche period | Già presente |
| **Delta %** | Tutte metriche period | Già presente |
| **Trend direction** | Serie temporali | completateByMonth, movimenti, invoices |
| **Accelerazione** | Delta del delta (2° derivata) | 2+ periodi confrontati |
| **Variazione significativa** | Z-score su serie storica | ≥12 mesi dati |
| **Stagionalità** | Same month prev year | completateByMonth (già YoY in semantic index) |
| **Effetto festività** | Esclusione giorni non lavorativi | Calendario IT + work_date |
| **Media** | Metriche continue | Già per tempo chiusura |
| **Mediana** | Tempi chiusura (robusta outlier) | data_ingresso, data_uscita |
| **Quartili** | Distribuzione tempi/costi | Per intervento |
| **Rolling average** | 3/6/12 mesi mobile | Serie mensili |
| **Indexed (base 100)** | Grafici KPI | Già in chart modes |
| **Normalizzazione per giorni lavorativi** | Ingressi/chiusure | Calendario |
| **Normalizzazione per mezzi attivi** | Interventi/mezzo | Parco mezzi per periodo |

## 8.3 Regole confronto per tipo metrica

| Tipo | Confronto consigliato | Oggi |
|------|----------------------|------|
| Count periodo (ingressi, chiusure) | prev_period, prev_year, avg_12_months | Sì |
| Snapshot (aperte, sotto scorta) | Solo trend storico se persistito | No |
| Ratio (ore/int, ricambi/int) | prev_period con stesso denominatore | Parziale |
| Currency (fatturato, costi) | prev_year per stagionalità | Sì |
| Duration (tempo chiusura) | Mediana + avg, invert | Sì (solo avg) |
| Ranking (top N) | Row delta posizione e valore | Sì |

## 8.4 Incoerenze da risolvere in progettazione

1. **Sparkline vs KPI card** — sparkline esclude manual override, KPI include
2. **Fatturato vs chiusure** — date emissione vs data completamento per "valore medio intervento"
3. **Timesheet vs schede** — ore totali timesheet vs ore su schede per costo manodopera
4. **Capitale immobilizzato** — snapshot confrontato con Δ periodo (concetti diversi)

---

# FASE 9 — INSIGHT AUTOMATICI

Solo insight **calcolabili** con dati reali. Formulazione esempio → formula.

## 9.1 Lavorazioni

| Insight | Formula/condizione |
|---------|-------------------|
| "Le chiusure sono aumentate del X%" | `deltaPct(chiusure_cur, chiusure_prev)` |
| "Il carico (ingressi) supera le chiusure di N" | `opened - completed > 0` |
| "Il tempo medio chiusura è diminuito di X giorni" | `avgClose_cur - avgClose_prev` |
| "N interventi superano i 14 giorni di apertura" | `countInterventiInRitardo > 0` |
| "Il mezzo X ha avuto 3 interventi in 30 giorni" | recidiva check |
| "Le chiusure di [mese] includono dati storici manuali" | `manualByMonth.has(mk)` |
| "Backlog in crescita da N settimane" | trend negativo saldo periodo consecutivo |

## 9.2 Clienti e mezzi

| Insight | Formula |
|---------|---------|
| "Il cliente X ha disponibilità al Y% (sotto soglia 75%)" | `disponibilitaPct < 75` |
| "N clienti sotto il 75% di disponibilità" | `countClientiSottoSoglia` |
| "Il mezzo X assorbe il Y% delle ore/chiusure" | `chiusure_mezzo / totale` |
| "Frequenza guasti ALTA su N mezzi" | `frequenzaGuasti = ALTA` count |
| "Il parco mezzi è cresciuto di N unità" | diff count mezzi (snapshot, no storico oggi) |

## 9.3 Magazzino

| Insight | Formula |
|---------|---------|
| "I ricambi utilizzati sono aumentati del X%" | `deltaPct(uscite_cur, uscite_prev)` |
| "N ricambi sotto scorta minima" | `sottoScortaCount` |
| "Il capitale immobilizzato è di €X" | `capitaleImmobilizzato` |
| "Il ricambio X è il più consumato (N uscite)" | top ricambi rank 1 |
| "N ordini fornitore nel periodo" | `mag_orders` |

## 9.4 Ore

| Insight | Formula |
|---------|---------|
| "Le ore totali sono aumentate del X%" | `deltaPct(ore_cur, ore_prev)` |
| "Media X ore per intervento chiuso" | `ore_total / completed` |
| "N ore straordinarie nel periodo (Y% del totale)" | `sum_straord / sum_ore` |
| "Assenze per N giorni nel periodo" | `count(assenza=true)` |

## 9.5 Economici

| Insight | Formula |
|---------|---------|
| "Fatturato €X (+Y% vs periodo precedente)" | `deltaPct(fatturato)` |
| "N fatture scadute per €X" | `scadute, daIncassare` |
| "N preventivi per €X, di cui M approvati" | preventivi + approvati |
| "Margine operativo stimato €X" | `fatturato - costi` |
| "Valore medio intervento €X" | `fatturato / completed` |
| "Il cliente X è il top per fatturato (€Y)" | top clienti rank 1 |
| "Costi manutenzione +Z% (ricambi + manodopera)" | `deltaPct(cost-tot)` |

## 9.6 Trasversali

| Insight | Formula |
|---------|---------|
| "Efficienza officina: X interventi per ora" | `cross_efficiency` |
| "Costo medio lavorazione €X" | `cross_cost_job` |
| "Valore generato €X/ora" | `cross_value_hour` |
| "Y ricambi medi per intervento" | `cross_parts_job` |
| "Questo cliente costa più di quanto fattura" | `costi_cliente > fatturato_cliente` (non oggi) |

## 9.7 Compliance / lifecycle (dati esistono, insight non generati)

| Insight | Fonte |
|---------|-------|
| "N mezzi con revisione scaduta" | asset_compliance_rules |
| "Tagliando previsto per mezzo X tra N giorni" | next_due_at |
| "KM attuali superano soglia tagliando" | km vs next_due_km |

## 9.8 Regole generazione insight

1. Soglia minima variazione per narrare: |delta%| > 5% o |delta abs| > soglia dominio
2. Non narrare metriche `trust: partial` senza disclaimer
3. Indicare quando confronto usa scaling (avg_12_months)
4. Priorità: alert operativi > trend significativi > ranking > informativi

## 9.9 Insight strip vs ANALISI IA (V2)

| Layer | Ruolo | Cadenza | Dipendenza AI |
|-------|-------|---------|---------------|
| **Insight strip** | 3-5 messaggi deterministici, sempre visibili | Ad ogni cambio periodo | No |
| **ANALISI IA** | Report narrativo strutturato su tutto il periodo | On-demand (consigliato settimanale/mensile) | Sì (Gemini) |

**Flusso V2:** gli insight deterministici (§9.1–9.7) alimentano sia la strip sia il **context AI** come fatti strutturati — il modello commenta e collega, non ricalcola.

**Cadenza report AI consigliata:**

| Preset | Confronto | Quando generare |
|--------|-----------|-----------------|
| `questa_settimana` / `settimana_scorsa` | `prev_period` | Review operativa settimanale |
| `questo_mese` / `mese_scorso` | `prev_year` o `prev_period` | Chiusura mese / consiglio direzionale |

**Non duplicare:** la strip non sostituisce il report AI; il report AI non ripete verbatim la strip — approfondisce con sintesi, priorità e collegamenti cross-dominio.

---

# FASE 10 — PERFORMANCE

## 10.1 Stato attuale — costo computazionale

| Operazione | Dove | Complessità | Note |
|------------|------|-------------|------|
| Fetch lavorazioni full | Client RQ | O(n) network + memory | Paginazione RPC esiste ma report usa list full |
| Fetch movimenti full | Client RQ | O(n) | Tutti i movimenti in memoria |
| Integrity layer | Client JS | O(n) per entità | Filtra orfani |
| Semantic index build | Client JS | O(n) completate | Per ogni cambio dataset |
| Derived bundle | Client JS | O(n log n) sort movimenti | Cached by fingerprint |
| KPI performance model | Client JS | O(n × m) mezzi×lav | Nested loops disponibilità |
| Domain analytics | Client JS | O(n) per sezione | Al expand sezione |
| Cross analytics | Client JS | O(1) | Su DTO pubblicati |
| Year matrix | Client JS | O(anni × 12) | Leggero |
| KPI chart series | Client JS | O(n) bucket | Per metrica plottata |

## 10.2 Matrice raccomandazioni per statistica

Legenda: **L** = live client, **V** = view SQL, **MV** = materialized view, **RPC** = funzione RPC, **C** = cache client, **D** = aggregazione giornaliera, **M** = aggregazione mensile, **BG** = background job

### LAVORAZIONI

| Statistica | Live | View | MV | RPC | Cache | D/M | BG | Costo |
|------------|------|------|----|----|-------|-----|-----|-------|
| Ingressi periodo | L | V | — | RPC | C | D | — | Basso |
| Chiusure periodo | L | V | MV | RPC | C | D | BG | Medio |
| Tempo medio chiusura | L | V | — | RPC | C | — | — | Medio |
| Backlog aperte | L | V | — | — | C | — | — | Basso |
| Oltre SLA | L | V | — | — | C | — | — | Basso |
| Top mezzi/clienti | L | — | MV | RPC | C | M | BG | Medio-Alto |
| Year matrix | L | — | MV | — | C | M | BG | Medio |
| Aging backlog | L | V | — | — | C | D | — | Basso |

### CLIENTI / MEZZI

| Statistica | Live | View | MV | RPC | Cache | D/M | BG | Costo |
|------------|------|------|----|----|-------|-----|-----|-------|
| Disponibilità flotta | L | — | — | — | C | — | — | **Alto** (nested) |
| Frequenza guasti | L | — | MV | — | C | M | BG | Medio |
| Compliance scadenze | — | V | — | RPC | C | — | — | Basso (non in report) |

### MAGAZZINO

| Statistica | Live | View | MV | RPC | Cache | D/M | BG | Costo |
|------------|------|------|----|----|-------|-----|-----|-------|
| Uscite qty periodo | L | V | MV | — | C | D | BG | Medio |
| Sotto scorta | L | V | — | — | C | — | — | Basso |
| Capitale immobilizzato | L | V | — | — | C | — | — | Basso |
| Movimenti mensili | L | — | MV | — | C | M | BG | Medio |
| Top ricambi | L | — | MV | RPC | C | M | BG | Medio |

### ORE

| Statistica | Live | View | MV | RPC | Cache | D/M | BG | Costo |
|------------|------|------|----|----|-------|-----|-----|-------|
| Ore totali periodo | — | V | MV | RPC | C | D | BG | Basso |
| Ore per dipendente | — | V | — | RPC | C | M | — | Basso |
| Ore per intervento | L | — | — | — | C | — | — | Medio (cross-domain) |

### ECONOMICI

| Statistica | Live | View | MV | RPC | Cache | D/M | BG | Costo |
|------------|------|------|----|----|-------|-----|-----|-------|
| Fatturato periodo | L | V esiste* | MV | RPC | C | M | BG | Basso |
| Preventivi periodo | L | — | — | RPC | C | M | — | Basso |
| Costi manutenzione | L | — | — | — | C | — | — | **Alto** (schede) |
| AR aging | — | V | MV | RPC | C | D | BG | Medio |
| Margine operativo | L | — | — | — | C | — | — | Alto |

*View `preventivi_billing_status` esiste; per fatturato no MV dedicata.

### CROSS

| Statistica | Live | View | MV | RPC | Cache | D/M | BG | Costo |
|------------|------|------|----|----|-------|-----|-----|-------|
| Tutti cross_* | L | — | — | — | C | — | — | Basso (se DTO pronti) |

## 10.3 Raccomandazioni architetturali (per progettazione, non implementazione)

### Tier 1 — Live client (ok oggi, <100ms)
Snapshot counts, period filters su dataset già in memoria, cross ratios su DTO.

### Tier 2 — RPC on-demand (target 100-500ms)
`list_lavorazioni_paginated` con filtri periodo, aggregazioni GROUP BY client/mezzo/status, timesheet SUM per range.

### Tier 3 — View SQL (target <100ms DB)
```sql
-- Esempi concettuali
v_report_daily_lavorazioni(date, opened, completed, cancelled)
v_report_monthly_fatturato(month, totale, count)
v_report_stock_snapshot(date, sku, qty, value)
v_report_timesheet_daily(date, employee_id, hours)
```

### Tier 4 — Materialized view + refresh
- `mv_report_monthly_kpis` — refresh nightly o on `get_operational_data_version()` change
- `mv_report_top_mezzi_rolling_12m`
- `mv_report_cliente_profitability`

### Tier 5 — Background job
- Precompute year matrix
- Snapshot giornaliero disponibilità flotta (per trend)
- Anomaly detection su serie mensili
- Health score (già tabella `health_score_runs`)

## 10.4 Cache strategy raccomandata

| Dato | TTL | Invalidazione |
|------|-----|---------------|
| Period KPIs | Fingerprint dataset | `invalidateReportUniverse` |
| Section DTOs | rangeKey + requestId | reset on period change |
| Chart series | Per config + range | Manual refresh |
| MV aggregati | 1h / nightly | `get_operational_table_versions` |
| AI analysis | Per fingerprint | Bump on data change |

## 10.5 Colli di bottiglia da prioritizzare

1. **Disponibilità flotta per cliente** — O(mezzi × lavorazioni) — candidato MV
2. **Fetch full movimenti** — crescita lineare — candidato RPC aggregata per periodo
3. **Costi manodopera da schede** — fetch schede lazy — candidato denormalizzazione o RPC
4. **Frequenza guasti** — regex su tutte le lavorazioni — candidato tag guasto su DB

---

# APPENDICE A — MAPPING SEZIONI NUOVA UX

Proposta organizzativa per ChatGPT (non implementata):

| Sezione target | Contenuto oggi | Dati aggiuntivi disponibili |
|----------------|----------------|----------------------------|
| **LAVORAZIONI** | KPI operativi, matrix, alert, classifiche interventi | Stati, priorità, SLA per priorità, aging, schede dettaglio |
| **CLIENTI E MEZZI** | Disponibilità, guasti, top, flotta | Anagrafica, compliance, km, TCO, insoluti |
| **MAGAZZINO E RICAMBI** | Consumi, scorte, ordini, top | Rotazione, margine, DDT ricevimento, copertura giorni |
| **ORE LAVORATE** | Timesheet, ore/int | Per operatore, assenze, reconciliazione schede, saturazione |
| **DATI ECONOMICI** | Preventivi, fatture, DDT, costi | AR aging, DSO, margine per cliente, funnel preventivo |
| **ANALISI TRASVERSALI** | 4 cross KPI | Catena preventivo→incasso, redditività, produttività, correlazioni |
| **ANALISI IA** | Sintesi Gemini on-demand | Report narrativo settimanale/mensile con KPI + eventi + confronto |

**Sezioni da riassorbire:**
- `grafici_kpi` → widget trend configurabili within ogni sezione analitica

**Sezione mantenuta e potenziata (V2):**
- `analisi_ai` → report completo periodico (settimana/mese), context arricchito con tutti i domini + diario operativo + alert; output strutturato invariato

## APPENDICE B — File chiave per implementazione futura

| Area | Path |
|------|------|
| Metric SSOT | `lib/report/metrics/report-metric-registry.ts` |
| Domain builders | `lib/report/report-domain-analytics.ts` |
| Formule | `lib/report/kpi-performance/kpi-performance-formulas.ts` |
| Selettori lav | `lib/report/lavorazioni-report-selectors.ts` |
| Semantic index | `lib/report/report-semantic-index.ts` |
| Period/compare | `lib/report/date-ranges.ts` |
| Integrity | `lib/report/report-data-integrity-layer.ts` |
| Section config | `components/report/report-sections-config.ts` |
| DB types | `src/types/supabase-tables.ts` |
| Dipendenze | `docs/report-data-dependencies.md` |
| Context builder AI | `lib/report/report-analysis/build-report-analysis-context.ts` |
| Schema I/O AI | `lib/report/report-analysis/report-analysis-schema.ts` |
| Cache analisi AI | `lib/report/report-analysis/report-analysis-cache.ts` |

## APPENDICE C — Documenti correlati esistenti

| Doc | Stato |
|-----|-------|
| `docs/report-data-dependencies.md` | Attivo — matrice dipendenze |
| `docs/report-metric-registry.audit.md` | Audit registry S0 |
| `docs/report-metric-catalog/packs/fleet-pack.md` | Draft — non implementato |
| `docs/report-design-system-rules.md` | Regole UI |
| `docs/performance-governance-report.md` | Governance performance |

---

**Fine audit.** Nessuna modifica al codice. Documento pronto per alimentare la progettazione della nuova esperienza analytics.
