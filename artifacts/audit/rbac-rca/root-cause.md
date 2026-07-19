## Classification

- [x] pre-existing
- [ ] regression
- [ ] flaky
- [ ] environment-drift

## Evidence

- commit introduced: stale test expectation (operatore dashboard allowed=true)
- first failing run: Phase 9 RCA (2026-07-19)
- affected file: `lib/regression/rbac-route-matrix.test.ts`
- dead-code Phase 5 touched RBAC: no
- environment drift: no (fixtures-only test)

## Root cause

`rbac-route-matrix.test.ts` expected `operatore` to access `/dashboard`, but:

- `lib/rbac-page-seed.ts` sets `operatore.dashboard = "none"`
- `supabase/migrations/20260714160000_operatore_dashboard_none.sql` enforces same
- `lib/auth/resolve-post-login-redirect.test.ts` asserts `operatoreNav.canAccessHref("/dashboard") === false`

Admin snapshot resolves correctly; failure was test matrix out of sync with SSOT seed.

## Fix

Update operatore route matrix: `/dashboard` → `allowed: false`.
