# P5 Operational Context

Operational context connects Analytics → Insight → Operational Context → Drill-down on `/report`.

## Architecture

```text
lib/report/operational-context/     ← SSOT (events, correlations, ranking)
        ↑
P4 build-business-report-context      ← thin caller (legacy correlations frozen)
        ↑
/api/report/operational-context       ← lazy summary + timeline split
```

## API

`GET /api/report/operational-context`

| Param | Values |
|-------|--------|
| `view` | `summary` (panel top-3), `timeline` (paginated), `full` |
| `cursor` / `limit` | timeline pagination |
| `from` / `to` / `compareMode` | period (via `parseRequestedPeriod`) |

Response: `{ summaryEvents[], timelineEvents[], correlations[], pagination? }`

Panel uses `view=summary` only — never loads full timeline.

## UI

First viewport: Executive → Insight → Primary Trend → Context Panel.

Second: domain grid, historical trend.

Third: Timeline V2, AI Business Report.

Legacy sections collapsed under `<details>` until P6.

## Correlations (P5)

Requires semantic or temporal link. Percent delta alone is insufficient.

Association verbs: `correlato | temporalmente_associato | possibile_fattore | evento_coincidente`.

## P4 freeze

`buildReportCorrelationsLegacy` unchanged. P4 parity gate: `p4-extraction-parity.test.ts`.
