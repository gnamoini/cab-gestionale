# Report P4 — AI Business Report Engine

Certified analytics → deterministic insights → bounded AI context → validated structured report → `report_runs` persistence.

## Architecture

```text
buildReportAnalytics (P1)
  + buildReportInsightsDto (26 rules)
  + operational diary/events (OIP, bounded)
  + deterministic correlation (pre-LLM)
       ↓
buildBusinessReportAiPromptContext (runtime only — not persisted wholesale)
       ↓
Gemini generateObject (business_report)
       ↓
schema + trust + claim validators
       ↓
mergeBusinessReport (deterministic buckets + AI overlay)
       ↓
report_runs (content + provenance refs)
```

## Logical report vs generation

- `logicalReportKey` = `reportType:periodStart:periodEnd:compareMode:engineVersion:schemaVersion`
- `generationVersion` = v1, v2, … on explicit regenerate
- `idempotencyKey` = logical key + `:v{generationVersion}`

## Persistence (`report_runs`)

| Column | Purpose |
|--------|---------|
| `logical_report_key` | Stable report identity |
| `generation_version` | Regeneration history |
| `content` | Structured `BusinessReport` |
| `provenance` | Refs only (metricIds, formulaIds, insightRuleKeys, counts) |
| `ai_status` | `completed` \| `unavailable` |
| `status` | `generating` \| `completed` \| `failed` |

Partial unique index: one `generating` row per logical report (atomic `beginReportRun`).

## AI fallback contract

- `status=completed` + `aiStatus=unavailable` when deterministic KPIs + insights publish without valid AI
- UI banner: "Interpretazione AI non disponibile"
- Never mark AI success without validation pass

## API

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/report/business-report` | GET | Latest / by `runId` |
| `/api/report/business-report` | POST | Generate / regenerate |
| `/api/report/business-report/history` | GET | History list |

## Cron

- `/api/cron/report-business-report-weekly` — closed week, Monday 07:00 UTC
- `/api/cron/report-business-report-monthly` — closed month, 1st 08:00 UTC

## UI

- `BusinessReportShell` in BI Center (`data-testid=business-report-shell`)
- History, detail, generate/regenerate, claim → P3 drill-down

## Feature flag

`NEXT_PUBLIC_BUSINESS_REPORT_ENABLED` (default ON)

- API + UI shell + React Query + cron all respect flag OFF (no fetch, no generation).

## Production Readiness (P4 closure)

### Baseline evidence

- HEAD `ae1fd8b8` typecheck via `git worktree` (no `stash -u`): **PASS**
- P4 module typecheck: **PASS** (zero `business-report` diagnostics)
- Full-repo typecheck with P0–P3 WIP: fails outside P4 paths only

### Lifecycle

- **`generate`**: cache → already_running → stale TTL retry → failed retry (same `generation_version`) → insert v1
- **`regenerate`**: always new `generation_version`
- Single-flight: partial unique index + `23505` → `already_running`

### Critical simulation test

`failure-retry-lifecycle.test.ts`: generate → AI failure → failed → generate retry → completed → history with correct generations.

### Migration

`20261221120000_report_runs_business_report.sql` — apply in test/staging first.

### Cron (UTC)

- Weekly: `0 7 * * 1` (Monday 07:00)
- Monthly: `0 8 1 * *` (1st 08:00)

### Status

**`P4 — PRODUCTION READY`** — see [report-p4-completion-report.md](./report-p4-completion-report.md)

## Tests

Control suite: `lib/control/suites/report-p4-business-report.suite.ts`

E2E: `e2e/smoke/report-business-report.spec.ts`

## P5 / P6 (out of scope)

- P5: advanced operational context
- P6: Ask Report / chat

See also: [report-p3-drilldown.md](./report-p3-drilldown.md), [report-p1-analytics-engine.md](./report-p1-analytics-engine.md)
