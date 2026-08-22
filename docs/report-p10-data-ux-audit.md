# P10 — Report Data & UX Audit

Audit date: 2026-08-22. Delta on [`report-data-inventory.md`](report-data-inventory.md) only — no full P9 re-audit.

---

## §1 Visible UI inventory (`/report`)

Mount order: Executive → Primary trend → Insight → Operational context → Advanced domains → Decision center → Historical → Timeline → Business report → Ask.

| Section | Element | metric/chart id | UI type | Period/compare/trust | Drill-down | Decision |
| ------- | ------- | --------------- | ------- | -------------------- | ---------- | -------- |
| Executive | KPI row (6) | lav-chiusi, lav-aperti, lav_late_sla, eco_fatturato, eco_da_incassare, eco_importo_scaduto | KPI cards | Toolbar period + compare | Yes | REFINE labels; RELOCATE eco_importo_scaduto in, scorta out |
| Primary trend | Selector + chart | user-selected eligible metric | Line chart | Toolbar + granularity | Yes | REFINE — business labels in selector |
| Insight | Strip | insight rules output | Cards | Toolbar | Partial | KEEP |
| Operational context | Panel | context signals | List/cards | Toolbar | Partial | KEEP |
| Economia | KPI grid + trend + charts | eco_incassato, eco_margine…, eco_preventivi… | KPI + chart | Lazy advanced | Yes | REFINE labels; KEEP eco_importo_scaduto duplicate removed (executive only) |
| Lavorazioni | KPI grid + trend + charts | lav-periodo, lav-tempo, lav_cancelled | KPI + chart | Lazy | Yes | REFINE |
| Magazzino | KPI grid + trend + charts | scorta, ric-usati, cap, mag_* | KPI + chart | Lazy | Yes | RELOCATE scorta from executive |
| Clienti | KPI + pareto | clienti, eco_fatturato | KPI + chart | Lazy | Yes | KEEP intentional duplicate fatturato |
| Risorse | KPI + trend | presence_hours, saturazione_team… | KPI + chart | Lazy | Yes | REFINE |
| Preventivi | KPI grid | eco_preventivi | KPI | Lazy | No | KEEP |
| Cross | KPI grid | cross_* | KPI | Lazy | Partial | KEEP |
| Decision center | Cards + evidence | decision metrics | Cards | Toolbar | Yes | REFINE evidence labels |
| Historical | Selector + chart | eco_fatturato default | Line chart | Local 12w/12m | No | REFINE — business selector |
| Timeline | Event feed | operational events | Timeline | Lazy expand | No | REFINE section title |
| Business report | P4 shell | narrative sections | Report | Period | No | KEEP |
| Ask | Drawer | NL prompts | Chat | Session | No | REFINE prompts |

---

## §2 Delta vs inventory (post-P9)

| Change | Notes |
| ------ | ----- |
| Executive swap | `eco_importo_scaduto` → executive tier; `scorta` → magazzino advanced |
| Presentation labels | `lib/report/ui/report-business-labels.ts` — UI-only SSOT |
| No new engine metrics | DSO, quote_conversion_pct unchanged |

---

## §3 Gap matrix (businessQuestion)

| Dato | Presente Report | Presente Gestionale | businessQuestion | Visualization | Trust | Decision | Destinazione |
| ---- | --------------: | ------------------: | ---------------- | ------------- | ----- | -------- | ------------ |
| lav-chiusi | Yes executive | Yes | Quante lavorazioni abbiamo chiuso? | KPI | exact/partial | KEEP | Executive |
| lav-aperti | Yes executive | Yes | Quanti lavori sono ancora da completare? | KPI | exact | KEEP | Executive |
| lav_late_sla | Yes executive | Yes | Quanti lavori hanno superato il termine previsto? | KPI + alert | exact | REFINE label | Executive |
| eco_fatturato | Yes executive + clienti | Yes | Quanto abbiamo fatturato? | KPI + trend | partial | KEEP duplicate | Executive + clienti pareto |
| eco_da_incassare | Yes executive | Yes | Quanto resta da incassare? | KPI | snapshot | KEEP | Executive |
| eco_importo_scaduto | Yes (was advanced) | Yes | Quanto è già scaduto? | KPI + drill | snapshot | RELOCATE | Executive (swap scorta) |
| scorta | Yes magazzino | Yes | Quali ricambi sono sotto scorta? | KPI | exact | RELOCATE | Magazzino advanced |
| eco_incassato | Yes economia | Yes | Quanto abbiamo incassato nel periodo? | KPI + trend | partial | KEEP | Economia advanced |
| saturazione_team | Yes risorse | Yes | Quanto stiamo utilizzando la capacità dell'officina? | KPI | partial | REFINE label | Risorse |
| DSO | No registry | Partial builders | Giorni medi per incassare? | — | — | DEFER | Out of scope P10 |
| quote_conversion_pct | No | Partial | Tasso conversione preventivi? | — | — | BLOCKED | Per inventory |
| Health score | No BI | Yes other surfaces | — | — | — | NOT_RELEVANT | — |

---

## §4 Executive swap rationale

| Out | In | Rationale |
| --- | -- | --------- |
| scorta (executive #6) | eco_importo_scaduto | Crediti scaduti risponde a domanda decisionale P0 (“quanto è già scaduto?”); scorta resta in magazzino advanced con drill-down |

Cap executive: **6 KPI** — swap, non espansione.

---

## §5 UI decisions

- **KEEP** one-engine / one data-map / drill-down registry
- **REFINE** all primary titles via `getReportBusinessLabel()` at render
- **REFINE** section shells via `getReportSectionCopy()`
- **NO ADD** new engine dimensions in P10
- **Intentional duplicate**: `eco_fatturato` executive KPI + clienti pareto (different question: headline vs concentrazione)

---

## §6 Redundancy pass

| Metric | Surfaces | Intentional |
| ------ | -------- | ----------- |
| eco_fatturato | Executive, Clienti pareto, Primary/Historical trend | Yes — different business questions |
| lav-chiusi / lav-aperti | Executive vs Lavorazioni advanced | Yes — headline vs domain detail |

---

## §7 Out of scope (confirmed)

DSO registry, quote_conversion_pct, health score in BI, operational panels back into `/report`, legacy chart rebuild.
