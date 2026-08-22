# P7 Completion Report — AI Decision Center

## §1 Baseline (pre-gate)

| Gate | Result |
|------|--------|
| `npm run ci:tsc` | PASS |
| P6 regression (`report-p6-ui-no-formulas`) | PASS |
| P7 core tests | PASS |

## §2 Domain model

- `lib/report/decision-center/types.ts`
- `fingerprint/decision-fingerprint.ts` (entity-aware + condition hash)
- `state/decision-status-transitions.ts`
- `versions.ts`

## §3 Rules registry

Six deterministic rules: backlog, stock reorder, customer revenue, margin, labor capacity, cash collection.

## §4 Engine

- Lightweight context builder (summary operational slice)
- Candidate builder + priority engine (versioned)
- Evidence builder + persistence merge (C1/C6)

## §5 Persistence

Migration `20261222120000_report_decision_points.sql` — split generated vs user state, RLS report read/write.

## §6 API

`GET` + `PATCH` under `/api/report/decision-center`.

## §7 AI

Wording-only schema + validator + golden tests (no prescriptive actions).

## §8 UI

`components/report/decision-center/*` — lazy IntersectionObserver mount, filters, drill-down links, nav `#bi-decisions`.

## §9 P4 bridge

`business-report-detail.tsx` summary links to Decision Center.

## §10 Governance

- `lib/regression/report-p7-ui-no-formulas.test.ts`
- `lib/control/suites/report-p7-decision-center.suite.ts`
- `e2e/smoke/report-decision-center.spec.ts`

## Rischi residui

- E2E richiede `SMOKE_ADMIN_*` (BLOCKED_EXTERNAL_ENV senza credenziali)
- Migration da applicare su staging/prod prima del deploy
- POST `/generate` AI wording async — follow-up se necessario in produzione
