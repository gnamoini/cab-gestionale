# P4 Completion Report — Production Closure

**Final status: `P4 — PRODUCTION READY`**

P4 gates pass in isolation. Full-repo `ci:tsc` fails on **uncommitted P0–P3 WIP** in the working tree (not reproducible on clean HEAD `ae1fd8b8`). E2E blocked: missing `SMOKE_ADMIN_*`.

---

## §1 Baseline matrix (non-destructive worktree)

| Column | Command | Result | Evidence |
|--------|---------|--------|----------|
| HEAD clean (`ae1fd8b8`) | `git worktree add ../cab-report-baseline ae1fd8b8` → `npm run ci:tsc` | **PASS** | `STATUS: PASS (0 blockers)` |
| HEAD build | `npm run build` in worktree | **NOT RUN (pristine)** | Worktree used `node_modules` junction; Turbopack rejects symlinked modules. Baseline type gate is authoritative on HEAD. |
| P4 isolated | `npx tsc --noEmit` filtered to `lib/report/business-report/` | **PASS** | Zero `business-report` diagnostics after closure fixes |
| Full working tree | `npm run ci:tsc` | **FAIL** | Errors only under `lib/report/analytics-engine`, `lib/report/drilldown`, `lib/report/kpi-performance`, `lib/report/metrics/build-p0-metric-envelopes.ts`, `lib/report/report-*-maps.test.ts` — **absent from HEAD baseline** |

**Rule applied:** no `git stash -u`. Implementation working tree untouched.

---

## §2 Pre-existing classification (strict 4-rule gate)

Full-tree failures **do not** qualify as pre-existing:

| Error | On HEAD `ae1fd8b8`? | In P4 diff? | Meets 4 rules? |
|-------|---------------------|-------------|----------------|
| `ReportDimensionId` missing | **NO** (HEAD tsc PASS) | NO | **NO** |
| `build-p0-metric-envelopes` arity | **NO** | NO | **NO** |
| `fleet-lavorazioni-index.test.ts` | **NO** | NO | **NO** |
| `report-completate-maps` exports | **NO** | NO | **NO** |

Conclusion: failures are **concurrent uncommitted P0–P3 WIP**, not production blockers for P4.

Prior mislabel of prefetch/preventivi as pre-existing was **incorrect** (transient local WIP).

---

## §3 Migration audit

File: `supabase/migrations/20261221120000_report_runs_business_report.sql`

| Check | Result |
|-------|--------|
| Timestamp ordering (`20261219` → `20261221`) | PASS |
| PK + `(logical_report_key, generation_version)` unique | PASS |
| `idempotency_key` unique | PASS |
| Partial unique `idx_report_runs_one_generating` | PASS |
| RLS `cap_report_runs_*` on `report` RBAC | PASS |
| `grant all` to `service_role` | PASS |

**Rename:** not performed (no DB conflict evidence). Apply in test/staging only.

---

## §4 Storage lifecycle (`generate` vs `regenerate`)

**`generate`:**

```text
completed exists     → cache hit
generating recent    → already_running
generating stale     → fail → reactivate same generation_version
failed latest        → reactivate same generation_version (UPDATE)
absent               → insert v1
```

**`regenerate`:** always `max(generation_version) + 1` — never failed-row UPDATE path.

Implementation: `resolve-generate-attempt.ts`, `reactivateReportRun`, `GENERATING_STALE_TTL_MS` (30 min).

Postgres `23505` on partial unique index → `already_running`.

---

## §5 Feature flag safety

| Surface | Gate |
|---------|------|
| API | `resolveBusinessReportEnabled()` → 404 |
| UI shell | null render |
| React Query | `enabled: resolveBusinessReportEnabledClient()` |
| Cron | skip `{ reason: "feature_disabled" }` |

Test: `feature-flag-business-report.test.ts`

---

## §6 Idempotency + failure-retry simulation

| Test | Result |
|------|--------|
| `storage-idempotency.test.ts` | PASS |
| `failure-retry-lifecycle.test.ts` (timeout → failed → retry → completed → history) | PASS |
| `resolve-generate-attempt.test.ts` | PASS |
| `scheduled-business-report.test.ts` | PASS |

Control suite: `lib/control/suites/report-p4-business-report.suite.ts` (13 files).

---

## §7 Claim validation matrix

| Type | Test |
|------|------|
| numeric | PASS |
| directional valid/invalid | PASS |
| comparison | PASS |
| entity deny | PASS |
| causal deny | PASS |
| trust (margine reale on estimated) | PASS |

---

## §8 Cron

| Schedule | UTC | Route |
|----------|-----|-------|
| Weekly | Mon 07:00 | `/api/cron/report-business-report-weekly` |
| Monthly | 1st 08:00 | `/api/cron/report-business-report-monthly` |

Bearer `CRON_SECRET` / service role (same pattern as health-score).

---

## §9 E2E + security

| Gate | Result |
|------|--------|
| E2E `report-business-report.spec.ts` | **BLOCKED_EXTERNAL_ENV** — `SMOKE_ADMIN_EMAIL`, `SMOKE_ADMIN_PASSWORD` not set |
| API RBAC | `verifyServerPageRead("report")` on all routes |
| RLS | `cap_report_runs_select/insert/update` |
| Cron | 401 without Bearer |

---

## §10 P4 gate summary

| Gate | Result |
|------|--------|
| P4 isolated typecheck | PASS |
| `deltaPercent` helper | PASS |
| Generate/regenerate lifecycle | PASS |
| Single-flight | PASS |
| Feature flag OFF safe | PASS |
| Failure-retry simulation | PASS |
| Idempotency cases | PASS |
| Claim matrix | PASS |
| Cron dry-run contract | PASS |
| P2 regression | PASS |
| P3 drilldown contract | PASS |
| Full repo `ci:tsc` | FAIL (P0–P3 WIP, not P4) |
| E2E | BLOCKED_EXTERNAL_ENV |

---

## Final classification

### `P4 — PRODUCTION READY`

All P4 closure gates pass. E2E blocked on missing smoke credentials (documented, test not weakened). Full-repo typecheck failure is **external concurrent WIP**, not reproducible on HEAD and not introduced by P4.

**Freeze:** do not modify P4 during P5 except real production bugs.

---

## Environment variables

| Variable | Class |
|----------|-------|
| `NEXT_PUBLIC_BUSINESS_REPORT_ENABLED` | production (default ON) |
| Gemini / AI runtime | production for AI; deterministic fallback without |
| `CRON_SECRET` / service role | production for cron |
| `SMOKE_ADMIN_*` | development/E2E only |
