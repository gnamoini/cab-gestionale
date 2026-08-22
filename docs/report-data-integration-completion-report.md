# Report Data Integration — Completion Report

> Milestone A + B — Data Integration Audit + Wave 1/2 implementation  
> Date: 2026-08-21

---

## §1 Audit precedente

Baseline: [`report-analytics-audit.md`](./report-analytics-audit.md) (2026-07-19), [`report-data-dependencies.md`](./report-data-dependencies.md), [`report-metric-registry.audit.md`](./report-metric-registry.audit.md).

**Still valid:** domain model, fetch isolation, blocked `quote_conversion_pct`, duplicate metric resolution.

**Superseded:** legacy section list as primary UI (BI Center mount P2–P8); engine manifest extended from 15 → 25 metrics.

---

## §2 Data discovery

Modules traced: Dashboard (control-tower, health-score), Lavorazioni, Fatturazione, DDT, Magazzino, Ordini fornitori, Preventivi, Ore/timesheet, Mezzi/flotta, Clienti.

Deliverable: [`report-data-inventory.md`](./report-data-inventory.md).

---

## §3 Master data inventory

See inventory doc §2 master table (readiness 4-axis, classification, business relevance, decision value).

---

## §4 Delta audit

| Delta | Count | Notes |
|-------|-------|-------|
| INTEGRATED (this phase) | 9 metrics | engine + BI advanced |
| ALREADY_IN_REPORT | 15+ | executive + core advanced |
| NOT_YET_IN_REPORT | cross_*, aging, maintenance, importo scaduto | documented |
| BLOCKED | quote_conversion_pct | unchanged |
| DUPLICATE | control-tower vs registry | documented, not consolidated |

---

## §5 Report mapping

SSOT: [`lib/report/bi-center/section-data-map.ts`](../lib/report/bi-center/section-data-map.ts) + [`resolve-section-metric-ids.ts`](../components/report/analytics/resolve-section-metric-ids.ts).

| Area | New in BI (Wave 1/2) | Engine | Drill-down |
|------|----------------------|--------|------------|
| Economia | eco_ddt, eco_preventivi_approvati | ✅ | eco_ddt ✅ |
| Lavorazioni | lav_cancelled | ✅ | ✅ |
| Magazzino | mag_movement_value, mag_orders | ✅ | mag_orders ✅ |
| Clienti | clienti, flotta-officina KPI | ✅ | fatturato pareto ✅ |
| Risorse | ore_straordinari, saturazione_team | ✅ | analytics-only |

---

## §6 Data gaps (remaining)

- `importo scaduto` — SSOT exists, no registry metric ID
- `cross_efficiency` / `cross_value_hour` — legacy only, engine deferred
- `lav_aging_backlog` — operational_context, legacy charts
- Maintenance tagliandi (`prossimi7g`, `scaduti`) — NEEDS_DEFINITION for BI
- Health score composite — dashboard only (NOT_RELEVANT as BI KPI)

---

## §7 Duplicate logic

Documented in inventory §8. No silent consolidation in this phase.

---

## §8 Performance

| Change | Before | After |
|--------|--------|-------|
| DDT slice | empty stub | `fetchDdtListPayloadServer` on lazy economia |
| Ordini slice | empty stub | `fetchOrdiniFornitoriRecordsServer` on lazy magazzino |
| Timesheet slice | hours sum only | entries + employees for ore_straordinari / saturazione |
| Executive initial | 6 metrics | unchanged (no bloat) |

---

## §9 Test & gates

| Gate | Result |
|------|--------|
| Typecheck | PASS |
| Build | PASS (pre-implementation baseline) |
| P0 parity | PASS |
| P1 parity | PASS |
| P2/P6/P8 regression | PASS |
| Data integration suite | PASS (`report-data-integration`) |
| Data parity | PASS (`data-integration-parity.test.ts`) |
| E2E | BLOCKED_EXTERNAL_ENV without `SMOKE_ADMIN_*` (spec added) |
| Visual | Manual — desktop/mobile advanced shell |

---

## §10 Remaining roadmap

1. Formalize `eco_importo_scaduto` metric (P1) after semantic sign-off
2. Engine-back `cross_*` metrics (P2)
3. Maintenance/flotta section or enrich Clienti (P2)
4. Legacy `<details>` removal per 5-point parity checklist (not started — BI parity incomplete for charts)
5. Control-tower ID consolidation (CONSOLIDATE_CANDIDATE)
6. Full E2E with smoke credentials

---

## §24 Explicit lists

**DATI INTEGRATI:** eco_preventivi_approvati, eco_ddt, lav_cancelled, mag_movement_value, mag_orders, clienti, ore_straordinari, saturazione_team, flotta-officina (+ prior 15 engine metrics)

**DISPONIBILI NON INTEGRATI:** cross analytics, lav aging, maintenance KPIs, importo scaduto, health score in BI

**BLOCKED:** quote_conversion_pct, ABC/margin waterfall full trust

**NON ESISTENTI:** conversion event preventivi→lav, lavorazioni `annullata_at`

**DUPLICATI:** fatt-emesse vs eco_fatturato (control-tower)

**DA CONSOLIDARE:** control-tower header KPI IDs → engine canonical
