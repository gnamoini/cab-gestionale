# Report metric registry — audit S0

Inventario KPI prima della migrazione SSOT (`REPORT_METRIC_REGISTRY`).

## Duplicati semantici risolti

| Id A | Id B | Decisione |
|------|------|-----------|
| `lav-chiusi` (unified) | `lav_completed` (domain) | `lav-chiusi` → owner **panoramica**; `lav_completed` → **deprecated**, adapter domain mappa valore ma UI lavorazioni non mostra card duplicata |
| `lav_clients` (domain) | `clienti` (unified) | `clienti` → panoramica; `lav_clients` → deprecated |
| `lav_avg_close` (domain) | `lav-tempo` (unified) | `lav-tempo` → panoramica secondario; `lav_avg_close` → deprecated per card UI |

## Registry entries

| id | label attuale | owner target | category | duplicato? | status | builder |
|----|---------------|--------------|----------|------------|--------|---------|
| lav-periodo | Lavorazioni periodo / Ingressi | panoramica | operational | no | active | build-report-model |
| lav-chiusi | Chiusure archiviate | panoramica | operational | vs lav_completed | active | merge-unified-kpi-display / perf |
| lav-saldo-periodo | Saldo backlog periodo | panoramica | operational | nuovo S3 | active | buildReportModel derived |
| lav-media-settimanale | Media settimanale chiusure | panoramica | operational | no | active | semanticIndex |
| lav-aperti | Interventi aperti | panoramica | operational | snapshot | active | kpi-performance |
| lav-tempo | Tempo medio chiusura | panoramica | operational | vs lav_avg_close | active | kpi-performance |
| clienti | Clienti attivi | panoramica | customer | vs lav_clients | active | build-report-model |
| cost-tot | Costi manutenzione | panoramica | economic | no | active | kpi-performance |
| scorta | Ricambi sotto scorta | panoramica | warehouse | snapshot | active | kpi-performance |
| cap | Capitale immobilizzato | clienti_mezzi | warehouse | snapshot | active | build-report-model |
| ric-usati | Ricambi movimentati | clienti_mezzi | warehouse | no | active | build-report-model |
| flotta-officina | Mezzi in officina | clienti_mezzi | fleet | snapshot | active | kpi-performance |
| mezzi | Mezzi in anagrafica | clienti_mezzi | fleet | snapshot | active | build-report-model |
| lav_open | Aperte | lavorazioni | operational | snapshot | active | buildOperationalAnalytics |
| lav_completed | Completate | lavorazioni | operational | duplicato lav-chiusi | deprecated | buildOperationalAnalytics |
| lav_archived | Archiviate | lavorazioni | operational | no | active | buildOperationalAnalytics |
| lav_cancelled | Annullate | lavorazioni | operational | no | active | buildOperationalAnalytics |
| lav_backlog | Backlog | lavorazioni | operational | snapshot | active | buildOperationalAnalytics |
| lav_avg_close | Tempo medio chiusura | lavorazioni | operational | duplicato lav-tempo | deprecated | buildOperationalAnalytics |
| lav_late_sla | Oltre SLA | lavorazioni | operational | snapshot | active | buildOperationalAnalytics |
| lav_clients | Clienti serviti | lavorazioni | customer | duplicato clienti | deprecated | buildOperationalAnalytics |
| mag_parts_qty | Ricambi utilizzati | magazzino_ricambi | warehouse | no | active | buildWarehouseAnalytics |
| mag_movement_value | Valore movimentato | magazzino_ricambi | warehouse | no | active | buildWarehouseAnalytics |
| mag_critical | Sotto scorta | magazzino_ricambi | warehouse | snapshot | active | buildWarehouseAnalytics |
| mag_orders | Ordini fornitori | magazzino_ricambi | warehouse | no | active | buildWarehouseAnalytics |
| ore_total | Ore totali | ore_lavorate | operational | no | active | buildLaborAnalytics |
| ore_per_job | Media ore/intervento | ore_lavorate | operational | derived | active | buildLaborAnalytics |
| eco_preventivi | Preventivi | dati_economici | economic | no | active | buildEconomicAnalytics |
| eco_preventivi_approvati | Preventivi approvati | dati_economici | economic | nuovo S5 | active | buildEconomicAnalytics |
| eco_invoices | Fatturato | dati_economici | economic | no | active | buildEconomicAnalytics |
| eco_ddt | DDT | dati_economici | economic | no | active | buildEconomicAnalytics |
| eco_margine_operativo_stimato | Margine operativo stimato | dati_economici | economic | nuovo S5 | active | derived-engine |
| cross_efficiency | Efficienza | analisi_incrociate | operational | internal | active | buildCrossAnalytics |
| cross_cost_job | Costo medio lavorazione | analisi_incrociate | economic | internal | active | buildCrossAnalytics |
| cross_value_hour | Valore/ora | analisi_incrociate | economic | internal | active | buildCrossAnalytics |
| cross_parts_job | Ricambi/intervento | analisi_incrociate | warehouse | internal | active | buildCrossAnalytics |

## Metriche morte / non in UI live

- `report-kpi-grid.tsx`, zone layout legacy — non referenziate in `report-analytics-view`.
- `kpi-performance-executive.tsx` — sostituito da merge pipeline.

## Gate S1

- [x] Duplicati documentati con owner target
- [x] Status deprecated per id domain duplicati
- [x] Nuovi id (`lav-saldo-periodo`, margine, preventivi approvati) elencati
