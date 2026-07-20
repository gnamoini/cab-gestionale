# Report V2 — Metric Migration Map

**Versione:** 1.0.0  
**Data:** 2026-07-19  
**Stato:** Contratto di migrazione analytics (documentazione only)  
**Prerequisito per:** `docs/report-v2-implementation-plan.md`

---

## 0. Scopo e vincoli

### 0.1 Scopo

Questo documento è il **contratto di migrazione analytics** tra [Technical Design](report-v2-technical-design.md) e Implementation Plan. Definisce per ogni metrica V1 e V2:

- identità tecnica (`v2MetricId`) vs presentazione (`displayKey`)
- stato migrazione e impatto contratto API
- mapping semantic dataset, layer, endpoint, componente UI
- requisiti parity test e drill-down executive

### 0.2 Vincoli architetturali

| Vincolo | Riferimento |
|---------|-------------|
| Nessuna modifica UI o pipeline Report V2 prima di questa map | ADR-REPORT-002, Technical Design §12 |
| Metric Registry = SSOT formule | `lib/report/metrics/report-metric-registry.ts` |
| Frontend riceve solo DTO semantici | ADR-REPORT-003 |
| RBAC prima della generazione DTO | ADR-REPORT-006 |
| Nessuna rimozione senza `deprecated → archived` | Metric Lifecycle |
| Executive row usa solo `metricId` registry | Technical Design §6 |

### 0.3 Sequenza documentale

```
Audit → Catalog (78) → Blueprint → Technical Design → Migration Map → Implementation Plan
```

### 0.4 Fonti SSOT

| Fonte | Path |
|-------|------|
| Catalogo V2 | `docs/report-analytics-catalog.json` |
| Registry V1 | `lib/report/metrics/report-metric-registry.ts` |
| Technical Design | `docs/report-v2-technical-design.md` |
| Blueprint UX | `docs/report-v2-blueprint.md` |
| Audit | `docs/report-analytics-audit.md` |
| Sezioni V1 | `components/report/report-sections-config.ts` |

---

## 1. Regole migrazione

### 1.1 `entityType`

| entityType | Lifecycle registry | Dove documentare |
|------------|-------------------|------------------|
| `metric` | `active` / `deprecated` / `archived` / `pending_validation` | §2, §3–8 |
| `section` | Solo impatto UI | §10 |
| `component` | Solo impatto UI | §10 |

**Regola:** `grafici_kpi`, `analisi_incrociate`, `ReportExecutiveRow` **non** creano record nel Metric Registry.

### 1.2 Stati migrazione (`migrationStatus`)

```
pending_validation   — catalog-only o non ancora parity-reviewed
mantenuta            — stesso significato, stesso o rinominato id canonico
unificata            — alias V1 assorbiti in v2MetricId
rinominata           — breaking rename metricId
sostituita           — cambio semantico business
deprecata            — alias V1-only in §2.2
nuova_v2             — senza equivalente V1 diretto, validata
archived             — rimossa dopo periodo compatibilità
```

**Transizione:** `pending_validation` → `mantenuta` | `nuova_v2` dopo parity review + owner.

### 1.3 Identità: `v2MetricId` vs `displayKey`

| Campo | Scopo |
|-------|-------|
| `v1MetricId` | Compatibilità legacy (registry V1) |
| `v2MetricId` | ID tecnico canonico registry/catalog target |
| `displayKey` | Label UI/i18n — può differire da metricId |

### 1.4 `contractImpact` (Technical Design §4b)

| Valore | Regola |
|--------|--------|
| `none` | Stessa formula e significato; solo nuovo componente DTO |
| `minor` | Nuovo campo DTO opzionale o alias rimosso con stessa formula |
| `major` | Cambio semantico o rename breaking |

### 1.5 SSOT naming — `eco_fatturato` / `eco_invoices`

| Ruolo | ID |
|-------|-----|
| **v2MetricId canonico** | `eco_fatturato` |
| **Alias legacy V1** | `eco_invoices` (oggi in registry + catalog) |
| **displayKey** | Fatturato periodo |

Il catalog JSON mantiene temporaneamente `eco_invoices` come `id`; rename catalog in Implementation Plan Sprint 2. Il Technical Design executive row va allineato a `eco_fatturato` (nota cross-ref).

### 1.6 Executive row SSOT (6 card)

| # | Card | v2MetricId | drill-down |
|---|------|------------|------------|
| 1 | Chiusure periodo | `lav-chiusi` | tab lavorazioni completate |
| 2 | Interventi aperti | `lav-aperti` | tab lavorazioni aperte |
| 3 | Oltre SLA | `lav_late_sla` | tab lavorazioni oltre SLA |
| 4 | Fatturato periodo | `eco_fatturato` | tab fatture periodo |
| 5 | Da incassare | `eco_da_incassare` | tab crediti da incassare |
| 6 | Sotto scorta | `scorta` | tab magazzino sotto scorta |

### 1.7 Chiarimento `lav_backlog` vs `lav_aging_backlog`

| Concetto | v2MetricId | Significato |
|----------|------------|-------------|
| WIP corrente | `lav-aperti` | Lavorazioni non archiviate (backlog operativo) |
| Aging bucket | `lav_aging_backlog` | Distribuzione età backlog (sostituisce `lav-saldo-periodo`) |

`lav_backlog` (registry V1) → deprecata verso `lav-aperti` (non verso aging).

---

## 2. Migration Master Registry

### 2.1 Metriche V2 catalog (78 righe)

| entityType | v1MetricId | v2MetricId | displayKey | migrationStatus | semanticDataset | layerV1 | layerV2 | contractImpact | endpoint | componenteUI | drillDown | parityTest | technicalOwner | note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| metric | lav-periodo | `lav-periodo` | Carico periodo | mantenuta | report_work_orders | client | client | none | /api/report/lavorazioni | ReportLavorazioniSection | sì → sezione dominio | none | Report Platform / Resp. officina | — |
| metric | lav_completed | `lav-chiusi` | Chiusure periodo | unificata | report_work_orders | client | client | minor | /api/report/lavorazioni | ReportLavorazioniSection | sì → tab lavorazioni completate | regression | Report Platform / Resp. officina | — |
| metric | lav_open, lav_backlog | `lav-aperti` | Interventi aperti | unificata | report_work_orders | client | client | minor | /api/report/lavorazioni | ReportLavorazioniSection | sì → tab lavorazioni aperte | regression | Report Platform / Resp. officina | — |
| metric | lav_avg_close | `lav-tempo` | Tempo medio chiusura | unificata | report_work_orders | client | client | minor | /api/report/lavorazioni | ReportLavorazioniSection | sì → sezione dominio | regression | Report Platform / Resp. officina | — |
| metric | lav-media-settimanale | `lav-media-settimanale` | Media chiusure settimanali | mantenuta | report_work_orders | client | client | none | /api/report/lavorazioni | ReportLavorazioniSection | opzionale | none | Report Platform / Resp. officina | — |
| metric | lav_cancelled | `lav_cancelled` | Annullate nel periodo | mantenuta | report_work_orders | client | client | none | /api/report/lavorazioni | ReportLavorazioniSection | opzionale | none | Report Platform / Resp. officina | — |
| metric | lav_late_sla | `lav_late_sla` | Oltre SLA | mantenuta | report_work_orders | client | client | none | /api/report/lavorazioni | ReportLavorazioniSection | sì → tab lavorazioni oltre SLA | none | Report Platform / Resp. officina | — |
| metric | — | `lav_recidiva` | Recidiva mezzi | nuova_v2 | report_work_orders | — | client | minor | /api/report/lavorazioni | ReportLavorazioniSection | opzionale | none | Report Platform / Resp. officina | — |
| metric | — | `lav_heatmap_annuale` | Heatmap annuale completate | nuova_v2 | report_work_orders | — | client | minor | /api/report/lavorazioni | ReportLavorazioniSection | opzionale | none | Report Platform / Resp. officina | — |
| metric | — | `top_mezzi_interventi` | Top mezzi per interventi | nuova_v2 | report_work_orders | — | client | minor | /api/report/lavorazioni | ReportLavorazioniSection | opzionale | none | Report Platform / Resp. officina | — |
| metric | — | `lav_andamento_mensile` | Andamento mensile ingressi/chiusure | nuova_v2 | report_work_orders | — | client | minor | /api/report/lavorazioni | ReportLavorazioniSection | opzionale | none | Report Platform / Resp. officina | — |
| metric | lav-saldo-periodo | `lav_aging_backlog` | Aging backlog aperte | sostituita | report_work_orders | — | client | major | /api/report/lavorazioni | ReportLavorazioniSection | opzionale | parity | Report Platform / Resp. officina | — |
| metric | — | `lav_median_close` | Mediana tempo chiusura | nuova_v2 | report_work_orders | — | client | minor | /api/report/lavorazioni | ReportLavorazioniSection | opzionale | none | Report Platform / Resp. officina | — |
| metric | — | `lav_by_priorita` | Volume per priorità | nuova_v2 | report_work_orders | — | client | minor | /api/report/lavorazioni | ReportLavorazioniSection | opzionale | none | Report Platform / Resp. officina | — |
| metric | — | `lav_by_stato` | Distribuzione per stato | nuova_v2 | report_work_orders | — | client | minor | /api/report/lavorazioni | ReportLavorazioniSection | opzionale | none | Report Platform / Resp. officina | — |
| metric | — | `lav_mttr` | MTTR tempo riparazione | nuova_v2 | report_work_orders | — | client | minor | /api/report/lavorazioni | ReportLavorazioniSection | opzionale | none | Report Platform / Resp. officina | — |
| metric | — | `lav_mtbf` | MTBF tra interventi | nuova_v2 | report_work_orders | — | client | minor | /api/report/lavorazioni | ReportLavorazioniSection | opzionale | none | Report Platform / Resp. officina | — |
| metric | lav_clients | `clienti` | Clienti nel periodo | unificata | report_assets | client | client | minor | /api/report/clienti | ReportClientiMezziSection | sì → sezione dominio | regression | Report Platform / Flotta | — |
| metric | flotta-officina | `flotta-officina` | Mezzi in officina | mantenuta | report_assets | client | client | none | /api/report/clienti | ReportClientiMezziSection | opzionale | none | Report Platform / Flotta | — |
| metric | mezzi | `mezzi` | Mezzi in anagrafica | mantenuta | report_assets | client | client | none | /api/report/clienti | ReportClientiMezziSection | opzionale | none | Report Platform / Flotta | — |
| metric | cap | `cap` | Capitale immobilizzato | mantenuta | report_assets | client | client | none | /api/report/clienti | ReportClientiMezziSection | opzionale | none | Report Platform / Flotta | Metric id invariato; UI spostata CLIENTI→MAGAZZINO (§10) |
| metric | — | `fleet_disponibilita_cliente` | clienti_disponibilita | pending_validation | report_assets | — | client | minor | /api/report/clienti | ReportClientiMezziSection | sì → sezione dominio | pending | Report Platform / Flotta | displayKey clienti_disponibilita per UI legacy |
| metric | — | `guasti_per_tipo_attrezzatura` | Guasti per tipo attrezzatura | nuova_v2 | report_assets | — | client | minor | /api/report/clienti | ReportClientiMezziSection | opzionale | none | Report Platform / Flotta | — |
| metric | — | `tempo_fermo_medio` | Tempo medio fermo | nuova_v2 | report_assets | — | client | minor | /api/report/clienti | ReportClientiMezziSection | opzionale | none | Report Platform / Flotta | — |
| metric | — | `frequenza_guasti_alta` | Mezzi frequenza guasti alta | nuova_v2 | report_assets | — | client | minor | /api/report/clienti | ReportClientiMezziSection | opzionale | none | Report Platform / Flotta | — |
| metric | — | `top_clienti_interventi` | Top clienti per interventi | nuova_v2 | report_assets | — | client | minor | /api/report/clienti | ReportClientiMezziSection | opzionale | none | Report Platform / Flotta | — |
| metric | — | `clienti_redditivita` | Redditività per cliente | nuova_v2 | report_assets | — | client | minor | /api/report/clienti | ReportClientiMezziSection | opzionale | none | Report Platform / Flotta | — |
| metric | — | `compliance_scadenze` | Compliance scadenze asset | pending_validation | report_assets | — | view | minor | /api/report/clienti | ReportClientiMezziSection | opzionale | parity | Report Platform / Flotta | — |
| metric | — | `pareto_clienti_interventi` | Pareto clienti interventi | nuova_v2 | report_assets | — | client | minor | /api/report/clienti | ReportClientiMezziSection | opzionale | none | Report Platform / Flotta | — |
| metric | — | `km_trend` | Trend chilometri mezzo | pending_validation | report_assets | — | rpc | minor | /api/report/clienti | ReportClientiMezziSection | opzionale | parity | Report Platform / Flotta | — |
| metric | — | `fleet_disponibilita_trend` | Trend disponibilità flotta | pending_validation | report_assets | — | background_job | minor | /api/report/clienti | ReportClientiMezziSection | opzionale | parity | Report Platform / Flotta | — |
| metric | mag_critical | `scorta` | Ricambi sotto scorta | unificata | report_inventory | client | client | minor | /api/report/magazzino | ReportMagazzinoSection | sì → tab magazzino sotto scorta | regression | Report Platform / Magazzino | — |
| metric | mag_parts_qty | `ric-usati` | Ricambi utilizzati | unificata | report_inventory | client | client | minor | /api/report/magazzino | ReportMagazzinoSection | sì → sezione dominio | regression | Report Platform / Magazzino | — |
| metric | mag_movement_value | `mag_movement_value` | Valore movimentato | mantenuta | report_inventory | client | client | none | /api/report/magazzino | ReportMagazzinoSection | sì → sezione dominio | none | Report Platform / Magazzino | — |
| metric | mag_orders | `mag_orders` | Ordini fornitori | mantenuta | report_inventory | client | client | none | /api/report/magazzino | ReportMagazzinoSection | opzionale | none | Report Platform / Magazzino | — |
| metric | — | `mag_movimenti_mensili` | Movimenti netti mensili | nuova_v2 | report_inventory | — | client | minor | /api/report/magazzino | ReportMagazzinoSection | opzionale | none | Report Platform / Magazzino | — |
| metric | — | `mag_top_ricambi` | Top ricambi consumo | nuova_v2 | report_inventory | — | client | minor | /api/report/magazzino | ReportMagazzinoSection | opzionale | none | Report Platform / Magazzino | — |
| metric | — | `giorni_copertura` | Giorni copertura stock | nuova_v2 | report_inventory | — | client | minor | /api/report/magazzino | ReportMagazzinoSection | opzionale | none | Report Platform / Magazzino | — |
| metric | — | `margine_ricambio` | Margine per ricambio | nuova_v2 | report_inventory | — | client | minor | /api/report/magazzino | ReportMagazzinoSection | opzionale | none | Report Platform / Magazzino | — |
| metric | — | `lead_time_ordini` | Lead time ordini fornitore | pending_validation | report_inventory | — | rpc | minor | /api/report/magazzino | ReportMagazzinoSection | opzionale | parity | Report Platform / Magazzino | — |
| metric | — | `rotazione_stock` | Rotazione stock | pending_validation | report_inventory | — | materialized_view | minor | /api/report/magazzino | ReportMagazzinoSection | opzionale | parity | Report Platform / Magazzino | — |
| metric | ore_total | `ore_total` | Ore totali | mantenuta | report_labor | client | client | none | /api/report/ore | ReportOreSection | sì → sezione dominio | none | Report Platform / HR | — |
| metric | ore_per_job | `ore_per_job` | Media ore per intervento | mantenuta | report_labor | client | client | none | /api/report/ore | ReportOreSection | opzionale | none | Report Platform / HR | — |
| metric | — | `ore_per_dipendente` | Ore per dipendente | pending_validation | report_labor | — | rpc | minor | /api/report/ore | ReportOreSection | opzionale | parity | Report Platform / HR | — |
| metric | — | `ore_straordinari` | Ore straordinarie | nuova_v2 | report_labor | — | client | minor | /api/report/ore | ReportOreSection | opzionale | none | Report Platform / HR | — |
| metric | — | `ore_assenze` | Assenze team | nuova_v2 | report_labor | — | client | minor | /api/report/ore | ReportOreSection | opzionale | none | Report Platform / HR | — |
| metric | — | `manodopera_cost` | Costo manodopera | nuova_v2 | report_labor | — | client | minor | /api/report/ore | ReportOreSection | opzionale | none | Report Platform / HR | — |
| metric | — | `gap_schede_timesheet` | Gap schede vs timesheet | nuova_v2 | report_labor | — | client | minor | /api/report/ore | ReportOreSection | opzionale | none | Report Platform / HR | — |
| metric | — | `saturazione_team` | Saturazione team | nuova_v2 | report_labor | — | client | minor | /api/report/ore | ReportOreSection | opzionale | none | Report Platform / HR | — |
| metric | cost-tot | `cost-tot` | Costi manutenzione | mantenuta | multi | client | client | none | /api/report/cross-analysis | ReportEconomiciSection | sì → sezione dominio | none | Report Platform | — |
| metric | eco_preventivi | `eco_preventivi` | Preventivi periodo | mantenuta | multi | client | client | none | /api/report/cross-analysis | ReportEconomiciSection | sì → sezione dominio | none | Report Platform | — |
| metric | eco_preventivi_approvati | `eco_preventivi_approvati` | Preventivi approvati | mantenuta | multi | client | client | none | /api/report/cross-analysis | ReportEconomiciSection | opzionale | none | Report Platform | — |
| metric | eco_invoices | `eco_fatturato` | Fatturato periodo | rinominata | multi | client | client | major | /api/report/cross-analysis | ReportEconomiciSection | sì → tab fatture periodo | parity | Report Platform | Catalog id legacy; v2MetricId canonico eco_fatturato |
| metric | eco_ddt | `eco_ddt` | DDT periodo | mantenuta | multi | client | client | none | /api/report/cross-analysis | ReportEconomiciSection | opzionale | none | Report Platform | — |
| metric | eco_valore_medio_intervento | `eco_valore_medio_intervento` | Valore medio intervento | mantenuta | multi | client | client | none | /api/report/cross-analysis | ReportEconomiciSection | opzionale | none | Report Platform | — |
| metric | eco_margine_operativo_stimato | `eco_margine_operativo_stimato` | Margine operativo stimato | mantenuta | multi | client | client | none | /api/report/cross-analysis | ReportEconomiciSection | opzionale | none | Report Platform | — |
| metric | — | `eco_da_incassare` | Da incassare | pending_validation | multi | — | client | minor | /api/report/cross-analysis | ReportEconomiciSection | sì → tab crediti da incassare | pending | Report Platform | — |
| metric | — | `eco_scadute` | Fatture scadute | pending_validation | multi | — | client | minor | /api/report/cross-analysis | ReportEconomiciSection | sì → sezione dominio | pending | Report Platform | — |
| metric | — | `fatturato_mensile` | Fatturato mensile | nuova_v2 | multi | — | client | minor | /api/report/cross-analysis | ReportEconomiciSection | opzionale | none | Report Platform | — |
| metric | — | `top_clienti_fatturato` | Top clienti per fatturato | nuova_v2 | multi | — | client | minor | /api/report/cross-analysis | ReportEconomiciSection | opzionale | none | Report Platform | — |
| metric | — | `win_rate_preventivi` | Win rate preventivi | nuova_v2 | multi | — | client | minor | /api/report/cross-analysis | ReportEconomiciSection | opzionale | none | Report Platform | — |
| metric | — | `funnel_preventivi` | Funnel preventivi | pending_validation | multi | — | view | minor | /api/report/cross-analysis | ReportEconomiciSection | opzionale | parity | Report Platform | — |
| metric | — | `ar_aging` | AR aging | pending_validation | multi | — | view | minor | /api/report/cross-analysis | ReportEconomiciSection | opzionale | parity | Report Platform | — |
| metric | — | `dso` | DSO giorni medi incasso | pending_validation | multi | — | rpc | minor | /api/report/cross-analysis | ReportEconomiciSection | opzionale | parity | Report Platform | — |
| metric | — | `preventivo_vs_consuntivo` | Preventivo vs consuntivo | nuova_v2 | multi | — | client | minor | /api/report/cross-analysis | ReportEconomiciSection | opzionale | none | Report Platform | — |
| metric | — | `mix_righe_fattura` | Mix righe fattura per tipo | pending_validation | multi | — | rpc | minor | /api/report/cross-analysis | ReportEconomiciSection | opzionale | parity | Report Platform | — |
| metric | — | `top_mezzi_costo` | Top mezzi per costo | nuova_v2 | multi | — | client | minor | /api/report/cross-analysis | ReportEconomiciSection | opzionale | none | Report Platform | — |
| metric | — | `preventivi_billing_residuo` | Residuo fatturazione preventivi | pending_validation | multi | — | view | minor | /api/report/cross-analysis | ReportEconomiciSection | opzionale | parity | Report Platform | — |
| metric | cross_efficiency | `cross_efficiency` | Efficienza officina | mantenuta | multi | client | client | none | /api/report/cross-analysis | ReportCrossSection | sì → sezione dominio | none | Report Platform | — |
| metric | cross_parts_job | `cross_parts_job` | Ricambi per intervento | mantenuta | multi | client | client | none | /api/report/cross-analysis | ReportCrossSection | sì → sezione dominio | none | Report Platform | — |
| metric | cross_cost_job | `cross_cost_job` | Costo medio lavorazione | mantenuta | multi | client | client | none | /api/report/cross-analysis | ReportCrossSection | sì → sezione dominio | none | Report Platform | — |
| metric | cross_value_hour | `cross_value_hour` | Valore per ora | mantenuta | multi | client | client | none | /api/report/cross-analysis | ReportCrossSection | sì → sezione dominio | none | Report Platform | — |
| metric | — | `cross_matrix_ore_ricambi` | Matrice ore vs ricambi | nuova_v2 | multi | — | client | minor | /api/report/cross-analysis | ReportCrossSection | opzionale | none | Report Platform | — |
| metric | — | `cross_sankey_preventivo_incasso` | Sankey preventivo a incasso | nuova_v2 | multi | — | client | minor | /api/report/cross-analysis | ReportCrossSection | opzionale | none | Report Platform | — |
| metric | — | `cross_scatter_costo_fatturato_cliente` | Scatter costo vs fatturato cliente | nuova_v2 | multi | — | client | minor | /api/report/cross-analysis | ReportCrossSection | opzionale | none | Report Platform | — |
| metric | — | `cross_scatter_ore_ricambi` | Scatter ore vs ricambi per intervento | nuova_v2 | multi | — | client | minor | /api/report/cross-analysis | ReportCrossSection | opzionale | none | Report Platform | — |
| metric | — | `cross_anomaly_volume` | Anomalie volume mensile | pending_validation | multi | — | background_job | minor | /api/report/cross-analysis | ReportCrossSection | opzionale | parity | Report Platform | — |
| metric | — | `cross_matrix_cliente_metriche` | Matrice cliente × metriche | nuova_v2 | multi | — | client | minor | /api/report/cross-analysis | ReportCrossSection | opzionale | none | Report Platform | — |

### 2.2 Metriche V1 legacy (alias deprecati)

Righe aggiuntive per `metricId` presenti solo in registry V1. Non duplicate in §2.1.

| entityType | v1MetricId | v2MetricId (replacement) | migrationStatus | contractImpact | releaseRimozione | compatibilitaAdapter | note |
|---|---|---|---|---|---|---|---|
| metric | `lav_open` | `lav-aperti` | deprecata | minor | post flag V2 + 1 release | redirect adapter | Duplica lav-aperti |
| metric | `lav_completed` | `lav-chiusi` | deprecata | minor | post flag V2 + 1 release | redirect adapter | Duplica lav-chiusi |
| metric | `lav_avg_close` | `lav-tempo` | deprecata | minor | post flag V2 + 1 release | redirect adapter | Duplica lav-tempo |
| metric | `lav_clients` | `clienti` | deprecata | minor | post flag V2 + 1 release | redirect adapter | Duplica clienti |
| metric | `mag_critical` | `scorta` | deprecata | minor | post flag V2 + 1 release | redirect adapter | Duplica scorta |
| metric | `lav-saldo-periodo` | `lav_aging_backlog` | deprecata | major | post flag V2 + 1 release | no redirect semantico | Saldo periodo ≠ aging |
| metric | `lav_backlog` | `lav-aperti` | deprecata | minor | post flag V2 + 1 release | redirect adapter | WIP = aperti |
| metric | `mag_parts_qty` | `ric-usati` | deprecata | minor | post flag V2 + 1 release | redirect adapter | Qty uscite |
| metric | `eco_invoices` | `eco_fatturato` | deprecata | major | post flag V2 + 1 release | alias fino a rename catalog | Vedi §1.5 |
| metric | `lav_archived` | `lav_cancelled` | deprecata | minor | post flag V2 + 2 release | valutare uso adapter | Registry only; snapshot storico |

---

## 3. Metriche mantenute

Metriche con `migrationStatus=mantenuta` (21 righe). Stesso significato business; id V1 = V2 (salvo `eco_invoices` in catalog → vedi §5).

- `lav-periodo` — Carico periodo (P0, report_work_orders)
- `lav-media-settimanale` — Media chiusure settimanali (P1, report_work_orders)
- `lav_cancelled` — Annullate nel periodo (P2, report_work_orders)
- `lav_late_sla` — Oltre SLA (P0, report_work_orders)
- `flotta-officina` — Mezzi in officina (P1, report_assets)
- `mezzi` — Mezzi in anagrafica (P3, report_assets)
- `cap` — Capitale immobilizzato (P1, report_assets)
- `mag_movement_value` — Valore movimentato (P0, report_inventory)
- `mag_orders` — Ordini fornitori (P2, report_inventory)
- `ore_total` — Ore totali (P0, report_labor)
- `ore_per_job` — Media ore per intervento (P1, report_labor)
- `cost-tot` — Costi manutenzione (P0, multi)
- `eco_preventivi` — Preventivi periodo (P0, multi)
- `eco_preventivi_approvati` — Preventivi approvati (P1, multi)
- `eco_ddt` — DDT periodo (P2, multi)
- `eco_valore_medio_intervento` — Valore medio intervento (P1, multi)
- `eco_margine_operativo_stimato` — Margine operativo stimato (P1, multi)
- `cross_efficiency` — Efficienza officina (P0, multi)
- `cross_parts_job` — Ricambi per intervento (P0, multi)
- `cross_cost_job` — Costo medio lavorazione (P0, multi)
- `cross_value_hour` — Valore per ora (P0, multi)

---

## 4. Metriche unificate

Alias V1 assorbiti nel `v2MetricId` canonico. Adapter V1 deve redirect fino a `archived`.


### lav_open + lav_backlog → `lav-aperti`

| Campo | Valore |
|-------|--------|
| migrationStatus | unificata |
| contractImpact | minor |
| Motivazione | Duplicazione semantica WIP (audit §2.1) |
| Azione registry | deprecate `lav_open`, `lav_backlog` |
| Parity | regression snapshot stesso periodo |
| Release rimozione UI alias | post flag V2 + 1 release |

### lav_completed → `lav-chiusi`

| Campo | Valore |
|-------|--------|
| migrationStatus | unificata |
| contractImpact | minor |
| Motivazione | Duplicazione chiusure periodo |
| Azione registry | deprecate `lav_completed` |
| Parity | regression snapshot |
| Release rimozione UI alias | post flag V2 + 1 release |

### lav_avg_close → `lav-tempo`

| Campo | Valore |
|-------|--------|
| migrationStatus | unificata |
| contractImpact | minor |
| Motivazione | Duplicazione tempo medio chiusura |
| Azione registry | deprecate `lav_avg_close` |
| Parity | regression snapshot |
| Release rimozione UI alias | post flag V2 + 1 release |

### lav_clients → `clienti`

| Campo | Valore |
|-------|--------|
| migrationStatus | unificata |
| contractImpact | minor |
| Motivazione | Duplicazione conteggio clienti periodo |
| Azione registry | deprecate `lav_clients` |
| Parity | regression snapshot |
| Release rimozione UI alias | post flag V2 + 1 release |

### mag_critical → `scorta`

| Campo | Valore |
|-------|--------|
| migrationStatus | unificata |
| contractImpact | minor |
| Motivazione | Duplicazione ricambi sotto scorta |
| Azione registry | deprecate `mag_critical` |
| Parity | regression snapshot magazzino |
| Release rimozione UI alias | post flag V2 + 1 release |

### mag_parts_qty → `ric-usati`

| Campo | Valore |
|-------|--------|
| migrationStatus | unificata |
| contractImpact | minor |
| Motivazione | Qty uscite vs ricambi utilizzati — stessa formula |
| Azione registry | deprecate `mag_parts_qty` |
| Parity | regression snapshot |
| Release rimozione UI alias | post flag V2 + 1 release |

---

## 5. Metriche rinominate

### `eco_invoices` → `eco_fatturato`

| Campo | Valore |
|-------|--------|
| v1MetricId | `eco_invoices` |
| v2MetricId | `eco_fatturato` |
| displayKey | Fatturato periodo |
| migrationStatus | rinominata |
| contractImpact | **major** |
| Motivazione | Allineamento blueprint/executive; nome business più chiaro |
| Parity | snapshot V1 eco_invoices vs V2 eco_fatturato stesso periodo |
| Catalog | id `eco_invoices` rinominato in Sprint 2 Implementation Plan |

### `fleet_disponibilita_cliente` — displayKey

| Campo | Valore |
|-------|--------|
| v2MetricId | `fleet_disponibilita_cliente` |
| displayKey | `clienti_disponibilita` (UI legacy) |
| migrationStatus | pending_validation |
| Nota | metricId tecnico ≠ label UI |

### Sezione `analisi_incrociate` → ANALISI TRASVERSALI

Documentata in §10 (`entityType=section`), non come metrica.

---

## 6. Metriche sostituite

### `lav-saldo-periodo` → `lav_aging_backlog`

| Campo | Valore |
|-------|--------|
| migrationStatus | sostituita |
| contractImpact | **major** |
| V1 significato | Saldo lavorazioni nel periodo (hero KPI) |
| V2 significato | Aging bucket backlog aperte |
| UI | Hero `lav-saldo-periodo` → card/grafico aging |
| Parity | **non applicabile** — significato diverso; documentare delta in release notes |

### Sezione `grafici_kpi` → widget trend embedded

| Campo | Valore |
|-------|--------|
| entityType | section |
| V1 | Accordion GRAFICI KPI |
| V2 | `TrendChart` embedded per dominio |
| migrationStatus | sostituita (superficie UI) |

### KPI `mezzi` in CLIENTI E MEZZI

| Campo | Valore |
|-------|--------|
| v2MetricId | `mezzi` |
| Azione P3 | Rimosso da hero CLIENTI (blueprint); metrica mantenuta in registry per uso interno |

---

## 7. Metriche deprecate

Vedi §2.2 per tabella completa. Riepilogo lifecycle:

| v1MetricId | replacement | contractImpact | lifecycleStatus target |
|------------|-------------|----------------|------------------------|
| lav_open | lav-aperti | minor | deprecated → archived |
| lav_completed | lav-chiusi | minor | deprecated → archived |
| lav_avg_close | lav-tempo | minor | deprecated → archived |
| lav_clients | clienti | minor | deprecated → archived |
| mag_critical | scorta | minor | deprecated → archived |
| lav-saldo-periodo | lav_aging_backlog | major | deprecated → archived |
| lav_backlog | lav-aperti | minor | deprecated → archived |
| mag_parts_qty | ric-usati | minor | deprecated → archived |
| eco_invoices | eco_fatturato | major | deprecated → archived |
| lav_archived | lav_cancelled | minor | deprecated → archived |

**Regola:** ogni `deprecata` ha `replacement` obbligatorio prima di `archived`.

---

## 8. Nuove metriche V2

Senza equivalente V1 diretto in registry (49 metriche catalog-only).

### 8.1 Executive-adjacent (P0, pending_validation)

| v2MetricId | displayKey | priority | owner |
|------------|------------|----------|-------|
| eco_da_incassare | Da incassare | P0 | Report Platform / Finance |
| eco_scadute | Fatture scadute | P0 | Report Platform / Finance |
| fleet_disponibilita_cliente | clienti_disponibilita | P0 | Report Platform / Flotta |

### 8.2 Catalog-only nuove (nuova_v2 / pending_validation)

- `lav_recidiva` — Recidiva mezzi (nuova_v2, P1)
- `lav_heatmap_annuale` — Heatmap annuale completate (nuova_v2, P1)
- `top_mezzi_interventi` — Top mezzi per interventi (nuova_v2, P1)
- `lav_andamento_mensile` — Andamento mensile ingressi/chiusure (nuova_v2, P1)
- `lav_median_close` — Mediana tempo chiusura (nuova_v2, P2)
- `lav_by_priorita` — Volume per priorità (nuova_v2, P2)
- `lav_by_stato` — Distribuzione per stato (nuova_v2, P2)
- `lav_mttr` — MTTR tempo riparazione (nuova_v2, P2)
- `lav_mtbf` — MTBF tra interventi (nuova_v2, P2)
- `fleet_disponibilita_cliente` — clienti_disponibilita (pending_validation, P0)
- `guasti_per_tipo_attrezzatura` — Guasti per tipo attrezzatura (nuova_v2, P2)
- `tempo_fermo_medio` — Tempo medio fermo (nuova_v2, P1)
- `frequenza_guasti_alta` — Mezzi frequenza guasti alta (nuova_v2, P1)
- `top_clienti_interventi` — Top clienti per interventi (nuova_v2, P1)
- `clienti_redditivita` — Redditività per cliente (nuova_v2, P1)
- `compliance_scadenze` — Compliance scadenze asset (pending_validation, P1)
- `pareto_clienti_interventi` — Pareto clienti interventi (nuova_v2, P2)
- `km_trend` — Trend chilometri mezzo (pending_validation, P2)
- `fleet_disponibilita_trend` — Trend disponibilità flotta (pending_validation, P2)
- `mag_movimenti_mensili` — Movimenti netti mensili (nuova_v2, P1)
- `mag_top_ricambi` — Top ricambi consumo (nuova_v2, P1)
- `giorni_copertura` — Giorni copertura stock (nuova_v2, P1)
- `margine_ricambio` — Margine per ricambio (nuova_v2, P2)
- `lead_time_ordini` — Lead time ordini fornitore (pending_validation, P2)
- `rotazione_stock` — Rotazione stock (pending_validation, P2)
- `ore_per_dipendente` — Ore per dipendente (pending_validation, P1)
- `ore_straordinari` — Ore straordinarie (nuova_v2, P1)
- `ore_assenze` — Assenze team (nuova_v2, P2)
- `manodopera_cost` — Costo manodopera (nuova_v2, P1)
- `gap_schede_timesheet` — Gap schede vs timesheet (nuova_v2, P2)
- `saturazione_team` — Saturazione team (nuova_v2, P2)
- `eco_da_incassare` — Da incassare (pending_validation, P0)
- `eco_scadute` — Fatture scadute (pending_validation, P0)
- `fatturato_mensile` — Fatturato mensile (nuova_v2, P1)
- `top_clienti_fatturato` — Top clienti per fatturato (nuova_v2, P1)
- `win_rate_preventivi` — Win rate preventivi (nuova_v2, P1)
- `funnel_preventivi` — Funnel preventivi (pending_validation, P1)
- `ar_aging` — AR aging (pending_validation, P1)
- `dso` — DSO giorni medi incasso (pending_validation, P1)
- `preventivo_vs_consuntivo` — Preventivo vs consuntivo (nuova_v2, P1)
- `mix_righe_fattura` — Mix righe fattura per tipo (pending_validation, P2)
- `top_mezzi_costo` — Top mezzi per costo (nuova_v2, P1)
- `preventivi_billing_residuo` — Residuo fatturazione preventivi (pending_validation, P1)
- `cross_matrix_ore_ricambi` — Matrice ore vs ricambi (nuova_v2, P2)
- `cross_sankey_preventivo_incasso` — Sankey preventivo a incasso (nuova_v2, P2)
- `cross_scatter_costo_fatturato_cliente` — Scatter costo vs fatturato cliente (nuova_v2, P1)
- `cross_scatter_ore_ricambi` — Scatter ore vs ricambi per intervento (nuova_v2, P2)
- `cross_anomaly_volume` — Anomalie volume mensile (pending_validation, P2)
- `cross_matrix_cliente_metriche` — Matrice cliente × metriche (nuova_v2, P2)

### 8.3 Insight-derived (Sprint 4)

Metriche synthetic `insight_*` **non** in registry fino a validazione. Non incluse in §2.1. Documentate in Implementation Plan Sprint 4.

---

## 9. Parity Matrix

Metriche con cambio layer, unificazione o rename breaking.

| v2MetricId | V1 compute | V2 compute | migrationStatus | contractImpact | parityTest | fixture |
|------------|------------|------------|-----------------|----------------|------------|---------|
| lav-aperti | client (lav_open + lav-aperti + lav_backlog) | client unified DTO | unificata | minor | regression | period-lavorazioni |
| lav-chiusi | client (lav_completed + lav-chiusi) | client unified DTO | unificata | minor | regression | period-lavorazioni |
| lav-tempo | client (lav_avg_close + lav-tempo) | client unified DTO | unificata | minor | regression | period-lavorazioni |
| clienti | client (lav_clients + clienti) | client unified DTO | unificata | minor | regression | period-clienti |
| scorta | client (scorta + mag_critical) | inventory DTO | unificata | minor | regression | magazzino-scorta |
| ric-usati | client (mag_parts_qty + ric-usati) | inventory DTO | unificata | minor | regression | magazzino-movimenti |
| eco_fatturato | client eco_invoices | client eco_fatturato | rinominata | major | parity | invoices-period |
| lav_aging_backlog | client lav-saldo-periodo | client aging buckets | sostituita | major | document-delta | aging-backlog |
| eco_da_incassare | client lazy economic | semantic DTO | pending_validation | minor | pending | invoices-open |
| eco_scadute | client lazy economic | semantic DTO | pending_validation | minor | pending | invoices-overdue |
| fleet_disponibilita_cliente | client O(n²) | client ottimizzato → rpc P2 | pending_validation | minor | perf + parity | fleet-availability |
| ore_per_dipendente | — | rpc P1 | pending_validation | minor | parity | timesheet |
| compliance_scadenze | — | view P1 | nuova_v2 | minor | parity | asset-compliance |
| km_trend | — | rpc P2 | nuova_v2 | minor | parity | fleet-km |
| fleet_disponibilita_trend | — | background_job P2 | nuova_v2 | minor | parity | fleet-trend |
| lead_time_ordini | — | rpc P2 | pending_validation | minor | parity | mag-orders |
| rotazione_stock | — | materialized_view P2 | pending_validation | minor | parity | mag-rotation |
| funnel_preventivi | — | view P1 | nuova_v2 | minor | parity | preventivi-funnel |
| ar_aging | — | view P1 | nuova_v2 | minor | parity | ar-buckets |
| dso | — | rpc P1 | nuova_v2 | minor | parity | invoices-dso |
| mix_righe_fattura | — | rpc P2 | nuova_v2 | minor | parity | invoice-lines |
| preventivi_billing_residuo | — | view P1 | nuova_v2 | minor | parity | preventivi-residuo |
| cross_anomaly_volume | — | background_job P2 | nuova_v2 | minor | parity | cross-volume |

---

## 10. UI Migration Impact

Solo `entityType=section` o `component`. **Non** in Metric Registry.

| entityType | V1 | V2 | migrationStatus | component owner | test regressione |
|------------|----|----|-----------------|-----------------|------------------|
| section | `analisi_ai` | ANALISI IA (enriched context) | mantenuta | Report Platform | AI context v2 parity |
| section | `lavorazioni` | LAVORAZIONI + DTO + dedup KPI | mantenuta | Report Platform | KPI parity lav |
| section | `clienti_mezzi` | CLIENTI E MEZZI (cap rimosso) | ristrutturata | Report Platform | fleet + clienti |
| section | `magazzino_ricambi` | MAGAZZINO (+ cap da CLIENTI) | ristrutturata | Report Platform | scorta parity |
| section | `ore_lavorate` | ORE LAVORATE + DTO | mantenuta | Report Platform | ore parity |
| section | `dati_economici` | DATI ECONOMICI + crediti P1 | mantenuta | Report Platform | eco parity |
| section | `analisi_incrociate` | ANALISI TRASVERSALI | rinominata | Report Platform | cross DTO prefetch |
| section | `grafici_kpi` | widget `TrendChart` embedded | sostituita | Report Platform | chart migration |
| component | `report-executive-kpi-section.tsx` | `executive/ReportExecutiveRow` | sostituita | Report Platform | 6 card RBAC + drill-down |
| component | `report-kpi-charts-section.tsx` | embedded per sezione | sostituita | Report Platform | trend parity |
| component | — | `insight-strip/InsightStrip` (max 5) | nuova | Report Platform | insight rules S4 |
| metric (UI only) | `cap` in CLIENTI | `cap` solo MAGAZZINO | spostata | Report Platform | layout responsive |

### 8 sezioni V1 → 6 analitiche + ANALISI IA

```
V1: analisi_ai | lavorazioni | clienti_mezzi | magazzino | ore | economici | analisi_incrociate | grafici_kpi
V2: analisi_ai | lavorazioni | clienti_mezzi | magazzino | ore | economici | analisi_trasversali | (embedded trends)
     + ReportExecutiveRow + InsightStrip
```

---

## 11. Rollout P0–P3

Allineato a [report-v2-priorities.md](report-v2-priorities.md) e Technical Design §10.

### P0 — Executive + dedup critici

**migrationStatus richiesto:** `mantenuta` o superiore (no `pending_validation` su executive, eccetto fleet fino a parity P0.8).

| v2MetricId | azione |
|------------|--------|
| lav-chiusi, lav-aperti, lav_late_sla | unificata/mantenuta + executive |
| eco_fatturato | rinominata + executive |
| scorta | unificata + executive |
| lav-periodo, lav-tempo, clienti, cost-tot, eco_preventivi | mantenuta |
| ore_total, mag_movement_value, ric-usati | mantenuta |
| cross_efficiency, cross_parts_job, cross_cost_job, cross_value_hour | mantenuta |
| eco_da_incassare, eco_scadute | pending_validation → executive dopo parity |
| fleet_disponibilita_cliente | pending_validation → ottimizzazione P0.8 |

### P1 — Crediti, ore, cross estesi, aging

eco_da_incassare, eco_scadute, ore_per_dipendente, cross scatter P1, lav_aging_backlog, insight strip base, funnel/ar/dso.

### P2 — Pipeline RPC/MV/BG

12 metriche layer ≠ client: km_trend, rotazione_stock, lead_time_ordini, cross_anomaly_volume, ecc.

### P3 — Cleanup

Rimozione KPI `mezzi` da CLIENTI, anomaly detection avanzata, archived alias V1.

---

## 12. Migration Map Validation Gate

**PASS obbligatorio prima di `docs/report-v2-implementation-plan.md`:**

| # | Criterio | Stato |
|---|----------|-------|
| 1 | Ogni catalog metric (78) ha riga §2.1 | ✓ |
| 2 | Ogni registry metric V1 ha stato §2.2 | ✓ |
| 3 | Ogni executive metric (6) ha drill-down §1.6 | ✓ |
| 4 | Ogni rename/unificazione breaking ha parity §9 | ✓ |
| 5 | Ogni deprecated ha replacement §7 | ✓ |
| 6 | Ogni nuova_v2 / pending_validation ha technicalOwner | ✓ |
| 7 | Nessuna section/component in §2.1 | ✓ |
| 8 | contractImpact=major per lav_aging_backlog, eco_fatturato | ✓ |

---

# Appendice A — Registry V1 completo

MetricId in `lib/report/metrics/report-metric-registry.ts` (37 id):

| v1MetricId | migrationStatus | replacement v2MetricId |
|------------|-----------------|------------------------|
| `lav-periodo` | mantenuta | `lav-periodo` |
| `lav-chiusi` | unificata | `lav-chiusi` |
| `lav-saldo-periodo` | deprecata | `lav_aging_backlog` |
| `lav-media-settimanale` | mantenuta | `lav-media-settimanale` |
| `lav-aperti` | unificata | `lav-aperti` |
| `lav-tempo` | unificata | `lav-tempo` |
| `clienti` | unificata | `clienti` |
| `cost-tot` | mantenuta | `cost-tot` |
| `scorta` | unificata | `scorta` |
| `cap` | mantenuta | `cap` |
| `ric-usati` | unificata | `ric-usati` |
| `flotta-officina` | mantenuta | `flotta-officina` |
| `mezzi` | mantenuta | `mezzi` |
| `lav_open` | deprecata | `lav-aperti` |
| `lav_completed` | deprecata | `lav-chiusi` |
| `lav_archived` | deprecata | `lav_cancelled` |
| `lav_cancelled` | mantenuta | `lav_cancelled` |
| `lav_backlog` | deprecata | `lav-aperti` |
| `lav_avg_close` | deprecata | `lav-tempo` |
| `lav_late_sla` | mantenuta | `lav_late_sla` |
| `lav_clients` | deprecata | `clienti` |
| `mag_parts_qty` | deprecata | `ric-usati` |
| `mag_movement_value` | mantenuta | `mag_movement_value` |
| `mag_critical` | deprecata | `scorta` |
| `mag_orders` | mantenuta | `mag_orders` |
| `ore_total` | mantenuta | `ore_total` |
| `ore_per_job` | mantenuta | `ore_per_job` |
| `eco_preventivi` | mantenuta | `eco_preventivi` |
| `eco_preventivi_approvati` | mantenuta | `eco_preventivi_approvati` |
| `eco_invoices` | deprecata | `eco_fatturato` |
| `eco_ddt` | mantenuta | `eco_ddt` |
| `eco_valore_medio_intervento` | mantenuta | `eco_valore_medio_intervento` |
| `eco_margine_operativo_stimato` | mantenuta | `eco_margine_operativo_stimato` |
| `cross_efficiency` | mantenuta | `cross_efficiency` |
| `cross_cost_job` | mantenuta | `cross_cost_job` |
| `cross_value_hour` | mantenuta | `cross_value_hour` |
| `cross_parts_job` | mantenuta | `cross_parts_job` |

**Cross-check catalog:** 78 metriche catalog + 10 alias legacy-only = copertura completa V1→V2.

---

# Appendice B — Decision Log migrazione

| ID | Data | Decisione | Motivazione | Conseguenze |
|----|------|-----------|-------------|-------------|
| MM-001 | 2026-07-19 | `eco_fatturato` canonico, `eco_invoices` legacy | Allineamento executive/blueprint | contractImpact major; rename catalog Sprint 2 |
| MM-002 | 2026-07-19 | `entityType` separato metric/section/component | Evita falsi record registry | grafici_kpi solo §10 |
| MM-003 | 2026-07-19 | Stato `pending_validation` | Catalog-only non definitive pre-parity | eco_da_incassare, fleet, cross P2 |
| MM-004 | 2026-07-19 | `lav_backlog` → `lav-aperti` | WIP ≠ aging | lav-saldo-periodo → lav_aging_backlog separato |
| MM-005 | 2026-07-19 | `displayKey` ≠ `v2MetricId` | Evita breaking UI | fleet_disponibilita_cliente / clienti_disponibilita |
| MM-006 | 2026-07-19 | `lav_archived` → `lav_cancelled` | Registry only, uso incerto | Review adapter prima archived |
| MM-007 | 2026-07-19 | ANALISI IA mantenuta | Blueprint: narrativa settimanale/mensile | Non sostituita da InsightStrip |
| MM-008 | 2026-07-19 | grafici_kpi → embedded trends | Blueprint P0 | Sezione accordion rimossa |

---

## Riferimenti

| Documento | Path |
|-----------|------|
| Technical Design | `docs/report-v2-technical-design.md` |
| Catalogo | `docs/report-analytics-catalog.json` |
| Blueprint | `docs/report-v2-blueprint.md` |
| Priorità | `docs/report-v2-priorities.md` |
| Prossimo | `docs/report-v2-implementation-plan.md` |

---

**Fine documento.** Nessuna modifica applicativa. Versione contratto: `1.0.0`.
