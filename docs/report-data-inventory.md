# Report — Master Data Inventory

> **Version:** 1.0 (Milestone A gate **APPROVED** 2026-08-21)  
> **Baseline audits:** [`report-analytics-audit.md`](./report-analytics-audit.md) (2026-07-19), [`report-data-dependencies.md`](./report-data-dependencies.md), [`report-metric-registry.audit.md`](./report-metric-registry.audit.md), P0–P8 docs  
> **Pre-gate:** `ci:tsc` PASS, `build` PASS, P0/P1 parity PASS, P2/P6/P8 regression PASS

---

## §0 Approval gate

| Gate item | Status |
|-----------|--------|
| Master inventory complete | ✅ |
| Readiness + relevance per row | ✅ |
| Executive/Advanced/Drilldown matrix | ✅ |
| Engine gap matrix + Wave 1/2 backlog | ✅ |
| Blocked / duplicate lists | ✅ |
| **Outcome** | **APPROVED → Milestone B** |

Approved implementation waves: see [`lib/report/bi-center/section-data-map.ts`](../lib/report/bi-center/section-data-map.ts).

---

## §1 Baseline audit validity

| Document | Still valid | Stale / superseded |
|----------|-------------|-------------------|
| `report-analytics-audit.md` | Domain model, DB tables, legacy section architecture | Pre–BI Center UI; section list replaced by P2 mount |
| `report-data-dependencies.md` | Fetch isolation per legacy section | KPI catalog partial vs `REPORT_METRIC_REGISTRY` |
| `report-metric-registry.audit.md` | Duplicate resolution (`lav-chiusi`/`lav_completed`) | Engine manifest was 15 metrics (now extended) |
| P0–P3 | `quote_conversion_pct` BLOCKED | Still valid |
| P4–P8 | AI/Decision/Ask architecture | E2E `BLOCKED_EXTERNAL_ENV` without smoke creds |

---

## §2 Master inventory (certified rows)

Readiness states: `READY` | `READY_WITH_TRUST_WARNING` | `NEEDS_DEFINITION` | `BLOCKED` | `NOT_RELEVANT`

Classification: `existing_metric` | `dimension` | `series` | `derived_metric` | `drilldown_only` | `operational_context` | `non_bi`

| Area | Dato/KPI | SSOT | Classification | dataAvail | semantic | engine | report | businessRel | decision | Priority | In Report | Delta |
|------|----------|------|----------------|-----------|----------|--------|--------|-------------|----------|----------|-----------|-------|
| Economia | eco_fatturato | `buildInvoicePeriodKpiExtended` | existing_metric | READY | READY | READY | READY | executive | high | P0 | ✅ Executive | ALREADY_IN_REPORT |
| Economia | eco_incassato | payments / pagata | existing_metric | READY | READY | READY | READY | executive | high | P0 | ✅ Advanced | ALREADY_IN_REPORT |
| Economia | eco_da_incassare | residuo snapshot | existing_metric | READY | READY | READY | READY | executive | high | P0 | ✅ Executive | ALREADY_IN_REPORT |
| Economia | eco_margine_operativo_stimato | fatturato − costi | derived_metric | READY | READY_WITH_TRUST_WARNING | READY | READY | management | high | P0 | ✅ Advanced | ALREADY_IN_REPORT |
| Economia | eco_preventivi | `countPreventiviInRange` | existing_metric | READY | READY | READY | READY | management | medium | P0 | ✅ Advanced | ALREADY_IN_REPORT |
| Economia | eco_preventivi_approvati | `isPreventivoCountedInEconomicStats` | existing_metric | READY | READY | READY | READY | management | medium | P1 | ✅ Wave 1 | NOT_YET_IN_REPORT → INTEGRATED |
| Economia | eco_ddt | `buildDdtKpi` count by `data_documento` | existing_metric | READY | READY_WITH_TRUST_WARNING | READY | READY | operational | low | P1 | ✅ Wave 1 | NOT_YET_IN_REPORT → INTEGRATED |
| Economia | importo scaduto | `buildInvoicePeriodKpiExtended.importoScaduto` | derived_metric | READY | READY | READY | READY | management | medium | P1 | ✅ Economia advanced | INTEGRATED as `eco_importo_scaduto` |
| Economia | quote_conversion_pct | — | — | — | BLOCKED | BLOCKED | BLOCKED | — | — | — | ❌ | BLOCKED |
| Lavorazioni | lav-chiusi / lav-periodo / lav-aperti / lav_late_sla / lav-tempo | lavorazioni-report-selectors | existing_metric | READY | READY | READY | READY | executive/operational | high | P0 | ✅ | ALREADY_IN_REPORT |
| Lavorazioni | lav_cancelled | `countAnnullateInRange` (`stato=annullata`, period=ingresso) | existing_metric | READY | READY_WITH_TRUST_WARNING | READY | READY | operational | medium | P1 | ✅ Wave 1 | NOT_YET_IN_REPORT → INTEGRATED |
| Lavorazioni | lav_aging_backlog | work-orders chart | operational_context | READY | READY | — | — | operational | medium | P2 | Legacy only | NOT_YET_IN_REPORT |
| Magazzino | scorta / ric-usati / cap | kpi-performance / magazzino | existing_metric | READY | READY | READY | READY | executive/operational | high | P0 | ✅ | ALREADY_IN_REPORT |
| Magazzino | mag_movement_value | `sumRicambiCostFromMagLog` | existing_metric | READY | READY | READY | READY | management | medium | P1 | ✅ Wave 1 | NOT_YET_IN_REPORT → INTEGRATED |
| Magazzino | mag_orders | ordini `dataOrdine` excl. annullato | existing_metric | READY | READY | READY | READY | operational | medium | P1 | ✅ Wave 1 | NOT_YET_IN_REPORT → INTEGRATED |
| Clienti | clienti | `uniqueClientiNelPeriodo` | existing_metric | READY | READY | READY | READY | management | medium | P1 | ✅ Wave 1 | NOT_YET_IN_REPORT → INTEGRATED |
| Clienti | fatturato per cliente | dimension on eco_fatturato | dimension | READY | READY | READY | READY | management | high | P0 | ✅ Pareto | ALREADY_IN_REPORT |
| Risorse | presence_hours / actual_labor | timesheet + schede | existing_metric | READY | READY | READY | READY | management | high | P0 | ✅ | ALREADY_IN_REPORT |
| Risorse | ore_straordinari | `computeLaborComposition` | existing_metric | READY | READY | READY | READY | operational | medium | P1 | ✅ Wave 1 | NOT_YET_IN_REPORT → INTEGRATED |
| Risorse | saturazione_team | `computeTeamSaturation` | derived_metric | READY | READY_WITH_TRUST_WARNING | READY | READY | management | medium | P1 | ✅ Wave 1 | NOT_YET_IN_REPORT |
| Fleet | flotta-officina | `countMezziInOfficinaProxy` | existing_metric | READY | READY_WITH_TRUST_WARNING | READY | READY | operational | low | P2 | ✅ Wave 2 | NOT_YET_IN_REPORT → INTEGRATED |
| Cross | cross_* | `build-report-cross-dto` computeCross* | derived_metric | READY | READY | READY | READY | management | medium | P2 | ✅ BI cross KPI | INTEGRATED |
| Dashboard | health score composite | health-score plugins | derived_metric | READY | READY_WITH_TRUST_WARNING | — | — | executive | medium | P2 | Dashboard only | NOT_RELEVANT for BI KPI |
| Fatturazione page | clientiConInsoluti | `buildInvoiceKpi` | non_bi | READY | READY | — | NOT_RELEVANT | detail | low | P3 | Fatturazione UI | NOT_RELEVANT |
| Mezzi | tagliandi scaduti/prossimi7g | maintenance-kpi-selectors | operational_context | READY | NEEDS_DEFINITION | — | — | operational | medium | P2 | Mezzi page | NOT_YET_IN_REPORT |
| Preventivi | profitto/margine per preventivo | preventivo-profitto | drilldown_only | READY | READY | — | — | detail | medium | P2 | Modal | drilldown_only |

---

## §3 Page → data mapping (with Motivazione)

| Dato | Fonte | Sezione Report | Visual | Rilevanza | Motivazione |
|------|-------|----------------|--------|-----------|-------------|
| Fatturato emesso | invoice-calculations | Executive / Economia | KPI + trend | P0 | Ricavi periodo |
| Incassato | payments | Economia | KPI + trend | P0 | Cassa realizzata |
| Crediti residui | residuo snapshot | Executive | KPI | P0 | Esposizione crediti |
| DDT (conteggio) | ddt-calculations | Economia | KPI + drill | P1 | Volume logistica — **non ricavo** |
| Annullate lav. | stato annullata | Lavorazioni | KPI + drill | P1 | Perdita carico (trust: data ingresso) |
| Valore movimentato | mag log | Magazzino | KPI | P1 | Costo/flusso ricambi |
| Ordini fornitori | ordini API | Magazzino | KPI + drill | P1 | Approvvigionamento |
| Clienti attivi | unique clienti | Clienti | KPI | P1 | Base clienti periodo |
| Straordinari | timesheet | Risorse | KPI | P1 | Pressione capacità |
| Saturazione | timesheet heuristic | Risorse | KPI | P1 | Utilizzo team |

---

## §4 Executive vs Advanced vs Drilldown

| Metric | Executive | Advanced | Drilldown |
|--------|-----------|----------|-----------|
| eco_fatturato | ✅ | ✅ | ✅ |
| eco_incassato | ❌ | ✅ | ✅ |
| eco_ddt | ❌ | ✅ | ✅ |
| mag_orders | ❌ | ✅ | ✅ |
| lav_cancelled | ❌ | ✅ | ✅ |
| flotta-officina | ❌ | ✅ | ❌ |
| dettaglio singolo DDT | ❌ | ❌ | ✅ |

---

## §5 Engine gap matrix (post-implementation)

| Dato | Gap class | Action | Status |
|------|-----------|--------|--------|
| eco_ddt | B | extend engine + ddt slice loader | ✅ Done |
| mag_movement_value | B | calculator SSOT | ✅ Done |
| mag_orders | B | ordini slice loader | ✅ Done |
| lav_cancelled | B | partial trust calculator | ✅ Done |
| cross_efficiency | B | deferred Wave 2+ | Pending |
| importo scaduto | D | needs registry formalization | Pending |
| quote_conversion_pct | C | BLOCKED | BLOCKED |

---

## §6 AI surfaces (selective — not auto-enabled)

| Metric | BI | P4 | P7 | P8 |
|--------|----|----|----|-----|
| eco_fatturato | ✅ | ✅ | ✅ | ✅ |
| eco_ddt | ✅ | ❌ | ❌ | ✅ (queryable) |
| lav_cancelled | ✅ | ❌ | candidate | ✅ |
| mag_orders | ✅ | ❌ | ❌ | ✅ |
| quote_conversion_pct | ❌ | ❌ | ❌ | ❌ |

---

## §7 Delta vs prior audit

| Class | Examples |
|-------|----------|
| NEW | `section-data-map.ts`, engine +10 metrics, ddt/ordini bundle loaders |
| MIGRATED | Domain KPIs from legacy builders → Analytics Engine |
| BLOCKED | `quote_conversion_pct`, margin waterfall ABC (P6) |
| DUPLICATE | `fatt-emesse` (control-tower) vs `eco_fatturato` — CONSOLIDATE_CANDIDATE |
| NOT_YET_IN_REPORT | health score in BI, maintenance KPIs, cross_* engine, importo scaduto |

---

## §8 Duplicated logic (document only)

| ID A | ID B | Note |
|------|------|------|
| `fatt-emesse` | `eco_fatturato` | Same invoice SSOT, different IDs in control-tower |
| `lav-completate` | `lav-chiusi` | Registry deprecated alias resolved |
| `eco_invoices` | `eco_fatturato` | Legacy economic section vs engine canonical |

---

## §9 Performance (eager / lazy)

| Block | Metrics | Loader slices | Eager? |
|-------|---------|---------------|--------|
| Executive | 6 KPIs | integrity + invoices | initial |
| Advanced Economia | eco_* + ddt | preventivi, invoices, ddt (lazy) | lazy section |
| Advanced Magazzino | mag_* | ordini (lazy) | lazy section |
| Risorse | ore_* | timesheet (lazy) | lazy section |

---

## §10 Remaining data lists (§24)

**INTEGRATED (Wave 1/2 + completion):** eco_preventivi_approvati, eco_ddt, lav_cancelled, mag_movement_value, mag_orders, clienti, ore_straordinari, saturazione_team, flotta-officina, **eco_importo_scaduto**, **cross_***

**AVAILABLE NOT INTEGRATED:** lav_aging_backlog, maintenance tagliandi KPIs, health score in BI

**BLOCKED:** quote_conversion_pct, **margin waterfall chart** (eco_margine_operativo_stimato KPI is replacement), ABC rotation

**NON_EXISTENT:** true quote conversion event, `annullata_at` on lavorazioni

**DUPLICATED:** control-tower vs registry IDs (see §8)

---

## §11 Legacy domain migration matrix

SSOT: [`lib/report/legacy/legacy-migration-matrix.ts`](../lib/report/legacy/legacy-migration-matrix.ts)

| Domain | Legacy section | BI target | Status |
|--------|----------------|-----------|--------|
| Economia | `dati_economici` | Advanced Economia + charts | **REMOVED** (gate: [`economia-removal-gate.ts`](../lib/report/legacy/economia-removal-gate.ts)) |
| Lavorazioni | `lavorazioni` | Advanced Lavorazioni + charts panel | **CHARTS_PARTIAL** |
| Magazzino | `magazzino_ricambi` | Advanced Magazzino + ordini | **CHARTS_PARTIAL** |
| Clienti | `clienti_mezzi` | Clienti section | **CHARTS_PARTIAL** |
| Risorse | `ore_lavorate` | Risorse section | **CHARTS_PARTIAL** |
| Cross | `analisi_incrociate` | Cross metrics + catena/trend | **CHARTS_PARTIAL** |

Regression: [`report-legacy-domain-removal.test.ts`](../lib/regression/report-legacy-domain-removal.test.ts)

---

## §12 Legacy chart migration matrix

SSOT: [`lib/report/legacy/legacy-chart-migration-matrix.ts`](../lib/report/legacy/legacy-chart-migration-matrix.ts)

Policy: **MIGRATE** → BI + parity → strip legacy; **BLOCKED** → `components/report/legacy-blocked/*` only; **REMOVE** → strip; **DEFER/KEEP_LEGACY** → justified operational embeds.

| Domain | MIGRATED charts | BLOCKED (count) | DEFER/KEEP |
|--------|-----------------|-----------------|------------|
| Lavorazioni | ingressi/chiusure | aging, funnel, SLA, recidiva, MTBF (6) | year matrix, Excel import |
| Magazzino | ordini table | movement, capitale, donut, pareto, risk (5) | monthly matrix |
| Clienti/Mezzi | KPI + fatturato pareto | fleet, MTBF/recidiva (2) | compliance |
| Risorse | KPI + trend | ore/dipendente (1) | timesheet embed |
| Cross | 4 KPI, pairs, catena, indexed trend | scatter, matrices, cost bar (4) | volume anomaly |
| Economia | all charts | — | REMOVED domain |

Per-domain removal gates: [`domain-removal-gates.ts`](../lib/report/legacy/domain-removal-gates.ts) — full `REMOVED` blocked while BLOCKED > 0.

### §12.1 P10 delta (2026-08-22)

| Change | Detail |
| ------ | ------ |
| Executive tier | `eco_importo_scaduto` promoted; `scorta` demoted to magazzino advanced |
| Presentation | `lib/report/ui/report-business-labels.ts` — UI-only business titles |
| No engine delta | DSO, quote_conversion_pct unchanged |

Audit: [`report-p10-data-ux-audit.md`](report-p10-data-ux-audit.md)

