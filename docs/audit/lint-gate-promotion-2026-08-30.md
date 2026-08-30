# Lint Hard-Gate Promotion — 2026-08-30

## Decision

**NOT_READY_FOR_HARD_GATE**

## Context

Fase 4 completed TSC + RBAC remediation with lint `0/0` on RC snapshot. Full regression certification is **NOT_CERTIFIED** due to unrelated blocking gates (`ci:build` bundle budgets, `smoke:regression:core`, live Supabase/E2E).

## Criteria evaluation

| Criterion | Status |
|-----------|--------|
| lint errors = 0 | PASS |
| lint warnings = 0 | PASS |
| ci:tsc PASS | PASS |
| RELEASE_READY | FAIL |
| Full regression matrix all blocking PASS | FAIL |
| Stability window (7d) | NOT MET |

## Recommendation

- **Do not** promote lint to hard gate in `release-gate.yml` until `RELEASE_READY` on a certified RC.
- Keep lint as advisory in CI; remediation slice is merge-safe for TSC/RBAC scope.
- Revisit after bundle budget + live gate certification in CI environment.

## No cutover

No workflow changes applied. Document-only decision per Fase 4 plan §10.
