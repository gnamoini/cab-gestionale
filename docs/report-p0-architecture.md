# Report P0 Architecture

Remediation tecnica P0 del Report BI Center — affidabilità numerica e contratti, **senza redesign UI**.

## Regola numeric invariance (Gate 5)

Ogni differenza baseline vs post-remediation deve essere classificata:

- `bug_fix_documentato`
- `correzione_duplicazione`
- `correzione_semantica_approvata`
- `nuova_metrica`

Differenza non classificata = **FAIL**.

Baseline fixture: `lib/report/__tests__/fixtures/*` + `p0-numeric-invariance.test.ts`.

## Metriche canoniche (P0-A)

| Alias deprecated | Canonico | Note |
| ---------------- | -------- | ---- |
| `lav_open` | `lav-aperti` | OIP brief: chiavi JSON invariate; resolver in lettura |
| `lav_completed` | `lav-chiusi` | |
| `lav_clients` | `clienti` | |
| `eco_invoices` | `eco_fatturato` | Domain analytics emette `eco_fatturato` |
| `lav-periodo` | — | Ingressi periodo, **non** unificare con aperti |

SSOT: `lib/report/metrics/report-metric-registry.ts`, `resolve-metric-id.ts`.

## Semantica economica (P0-B)

SSOT: `lib/report/metrics/economic-metric-semantics.ts`

| Concetto | metricId | formulaId | semantics | trust |
| -------- | -------- | --------- | --------- | ----- |
| revenue | `eco_fatturato` | `invoice_emitted_in_period` | flow | verified |
| collected | `eco_incassato` | `payments_in_period` | flow | verified |
| receivables | `eco_da_incassare` | `invoice_residuo_snapshot` | snapshot | verified |
| margin | `eco_margine_operativo_stimato` | `revenue_minus_labor_minus_parts` | flow | estimated |

Margine operativo UI resta `eco_margine_pct` (formula invariata).

### quote_conversion_pct — BLOCKED

Workflow preventivi: `bozza | inviato | annullato` — nessuno stato accettazione/conversione.

`countPreventiviApprovatiInRange` conta solo `inviato + inviatoAt` (invio commerciale, non conversione).

Registry entry `quote_conversion_pct` status `draft`, validation `blocked`. **Nessuna formula inventata in P0.**

## Metric Envelope (P0-C)

Contratto minimo — **non** motore di calcolo:

- `lib/report/metrics/report-metric-envelope.ts`
- `lib/report/metrics/build-p0-metric-envelopes.ts`

UI non migrata; envelope per test, parity, preparazione P1.

## Period Context (P0-D)

`components/report/context/report-period-context.tsx` — SSOT periodo/compare.

Migrati: executive boundary (optional context), derived prefetch (requirements via visibility).

## Lazy fetch (P0-E)

`lib/report/report-data-requirements.ts` + `use-report-derived-prefetch.ts`:

- preventivi/invoices/ddt solo se sezione economica/cross/perf+eco
- ordini se magazzino aperto
- timesheet se ore/cross

## Schede per-consumer (P0-F)

`lib/report/schede-report-scope.ts`:

| Scope | Semantica |
| ----- | --------- |
| `completed_in_period` | `dataCompletamento` in range — manodopera/margine |
| `hours_in_period` | `actual_labor_hours` > 0 su completate in range |
| `cross_completed_in_period` | cross analysis |

Union degli id per consumer attivi; non più `lavListRows.map(id)`.

## Fleet index (P0-G)

`lib/report/kpi-performance/fleet-lavorazioni-index.ts` — O(mezzi+lav) vs O(n×m).

## Flow vs snapshot compare (P0-I)

`compareForApplicability` in `from-kpi-card-model.ts`:

- compare legacy con `compareRows` preservato
- snapshot senza history → `unavailable/snapshot`

Capitale: confronto su Δ capitale periodo (legacy intenzionale).

## Performance (P0-K)

- `enableMezzi: false` in `report-analytics-view.tsx` (policy test)
- Schede scoped + query gated by section visibility

## Resta P1

Analytics engine, envelope-driven UI, API migration completa, quote_conversion se funnel definito, materialized views, Ask Report.
