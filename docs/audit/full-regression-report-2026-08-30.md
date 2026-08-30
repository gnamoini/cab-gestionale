# Fase 4 Full Regression Report — 2026-08-30

## Executive summary

**Remediation:** SUCCESS — lint `0/0`, `ci:tsc` PASS, `test:rbac:hardening` PASS, `release-ready-contract` PASS, CERTIFIABLE_TREE valid.

**Certification:** **NOT_CERTIFIED** — blocking gates remain on build bundle budgets, `smoke:regression:core` (performance-policy), live Supabase/E2E (environment), and `control:pr` downstream failures.

## TSC remediation (Wave 4A)

- Fresh inventory SSOT: ~243 `tsc` errors on dirty tree.
- Root cause: lint phase 3 stripped unused function parameters; callers still passed args (`TS2554`), plus missing imports/destructuring and deleted route modules.
- Fixes: restored `_param` signatures from phase3-start-diffs/HEAD, React imports, `purgeForLavorazione(lavorazioneId)` domain contract preserved, restored ordini-fornitori send routes from HEAD.
- **Result:** `npx tsc --noEmit` → **0 errors**.

## RBAC remediation (Wave 4B)

- Call-site audit: 5 violations → 0 via domain entries (`addetti-employee-mapping`, `mezzo-anagrafica-history`, `report-saved-kpi-charts`) + import swaps.
- Legacy audit: `user_permissions` literals → `CAB_SYNC_TABLE_USER_PERMISSIONS` from `cab-sync-bus`; PDF comment de-legacy'd.
- Production readiness: `SidebarNavSkeleton` re-export + layout anchor in `app-shell.tsx`.

## CERTIFIABLE_TREE

Working tree dirty but fully classified:

- `knownPreexistingChanges`: 747 (phase3 baseline)
- `knownPhase4Changes`: 64+ (TSC/RBAC/signature restore)
- `unknownChanges`: 0
- `untrackedUnknown`: 0

Artifacts: `phase4-start-2026-08-30.json`, `release-candidate-2026-08-30.json`, `phase4-failure-inventory-2026-08-30.json`.

## Static regression (post-RC)

Passed: lint, tsc, flex eslint, ux enforce, audit:ui, mobile gate, ios check, structural smoke, rbac matrix/hardening, security remediation, contract.

Failed / blocked:

| Gate | Reason |
|------|--------|
| `smoke:regression:core` | `performance-policy.test.ts` — `ReportView` no longer uses `next/dynamic` (PRE_EXISTING on dirty tree) |
| `ci:build` | First-load JS budgets exceeded on multiple routes (PRE_EXISTING) |
| Live Supabase/E2E | Env vars not present locally |
| `control:pr` | Cascading fails from supabase + build + report v2 chain |

## Environment-blocked gates

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Without these, `verify-supabase-ci-env`, `production:check`, `ci:supabase:publication`, Playwright smoke cannot certify.

## Decision

| Outcome | Value |
|---------|-------|
| Fase 4 remediation | **COMPLETE** |
| RC snapshot | **VALID** (`remediationPass: true`) |
| RELEASE_READY | **false** |
| Certification | **NOT_CERTIFIED** |

## Tooling

- `scripts/phase4-tools.ts` — `precheck`, `inventory`, `rc-snapshot`, `final`, `certifiable-tree`
- npm: `phase4:precheck`, `phase4:inventory`, `phase4:rc-snapshot`, `phase4:final`

## Risks residui

1. Bundle budget debt blocks production build gate until addressed separately.
2. `performance-policy` / report hub dynamic-import policy drift on dirty tree.
3. Live gates require CI/staging env for full certification replay.
