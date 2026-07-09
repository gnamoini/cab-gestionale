# Report — matrice dipendenze dati

> Nessuna section importa hook/query di un'altra sezione. Incroci solo via `useReportAnalyticsDerived()`.

## Architettura

| Layer | Ruolo |
|-------|--------|
| `ReportAnalyticsDerivedProvider` | SSOT snapshot derivati per periodo (`rangeKey` + `revision`) |
| Domain sections | Fetch dati propria area → `publish*Analytics` |
| `analisi_incrociate` | Read-only `buildCrossAnalytics(derived)` |
| `analisi_ai` | Fuori DerivedContext — props dedicate `ReportAiSectionProps` |
| Strip esecutiva | Sintesi testuale + alert — **nessun KPI numerico** (`section: "strip"` vuoto nel catalogo) |

## Catalogo KPI (`lib/report/report-kpi-catalog.ts`)

| KPI id | Sezione | Owner | Fonte |
|--------|---------|-------|-------|
| `lav_open` | lavorazioni | operational | kpi-performance-formulas |
| `lav_completed` | lavorazioni | operational | lavorazioni-report-selectors |
| `lav_archived` | lavorazioni | operational | lavorazioni-report-adapter |
| `lav_cancelled` | lavorazioni | operational | lavorazioni-report-selectors |
| `lav_backlog` | lavorazioni | operational | kpi-performance-formulas |
| `lav_avg_close` | lavorazioni | operational | lavorazioni-report-selectors |
| `lav_late_sla` | lavorazioni | operational | kpi-performance-formulas |
| `lav_clients` | lavorazioni | operational | lavorazioni-report-selectors |
| `mag_parts_qty` | magazzino_ricambi | warehouse | magazzino-period-aggregate |
| `mag_movement_value` | magazzino_ricambi | warehouse | kpi-performance-formulas |
| `mag_critical` | magazzino_ricambi | warehouse | kpi-performance-formulas |
| `mag_orders` | magazzino_ricambi | warehouse | ordini-fornitori |
| `ore_total` | ore_lavorate | labor | timesheet-totals |
| `ore_per_job` | ore_lavorate | labor | report-domain-analytics |
| `eco_preventivi` | dati_economici | economic | preventivi-records |
| `eco_invoices` | dati_economici | economic | invoice-calculations |
| `eco_ddt` | dati_economici | economic | ddt-calculations |
| `cross_efficiency` | analisi_incrociate | cross | report-domain-analytics |
| `cross_cost_job` | analisi_incrociate | cross | report-domain-analytics |
| `cross_value_hour` | analisi_incrociate | cross | report-domain-analytics |
| `cross_parts_job` | analisi_incrociate | cross | report-domain-analytics |

## Fetch per sezione

| Sezione | Query / hook (solo area propria) | Publish |
|---------|----------------------------------|---------|
| lavorazioni | dati live da `report-analytics-view` (attive/storico/completate) | `publishOperationalAnalytics` |
| magazzino_ricambi | `useOrdiniFornitoriQuery` (lazy) | `publishWarehouseAnalytics` |
| ore_lavorate | `useReportTimesheetKpi` (lazy) | `publishLaborAnalytics` |
| dati_economici | `usePreventiviRecordsQuery`, `useInvoicesQuery`, DDT report query (lazy) | `publishEconomicAnalytics` |
| analisi_incrociate | — | — |
| analisi_ai | — (Gemini zone esistente) | — |

## Cross analytics — input derivati

| KPI cross | Dipende da |
|-----------|------------|
| Efficienza | `operational.completedInPeriod` + `labor.totalHours` |
| Ricambi/intervento | `warehouse.partsUsedQty` + `operational.completedInPeriod` |
| Costo medio lavorazione | `warehouse.movementValue` + `labor.manodoperaCost` + `operational.completedInPeriod` |
| Valore/ora | `economic.invoicesBilled` + `labor.totalHours` |

## Invalidazione

- Cambio periodo → `resetForRangeChange(rangeKey)` nel provider (azzera tutti i DTO)
- `publish*` con `requestId` monotonic — risposte stale scartate se `requestId` < ultimo accettato o `rangeKey` ≠ corrente
- `invalidate(section)` — bump version singola chiave (uso futuro)

## Estensione nuova sezione

1. `DerivedKey` + DTO in `report-domain-types.ts`
2. `build*Analytics` in `report-domain-analytics.ts`
3. Voce in `REPORT_KPI_CATALOG` + `REPORT_SECTIONS` + `REPORT_SECTION_UI`
4. `sections/report-*-section.tsx` con un solo `publish*`
5. Test `report-section-boundaries.test.ts` (allowlist publish)
