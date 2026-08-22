# V9.3 Revert Report

## V9.3 STATUS: **REVERTED**

| Metric | Value |
|--------|-------|
| `/login` baseline (V9.2) | **1816.5 KB** |
| `/login` V9.3 after | 1816.7 KB |
| `/login` post-revert | **1816.5 KB** |
| Delta V9.3 | +0.2 KB |
| Graph isolation (V9.3) | **FAIL** |

## Reason for revert

`auth-context` was not the dominant root. Shared settings aggregate (~351 KB chunk) + `map-auth-user` → `lib/auth/rbac` path remained.

## V9.2 preserved: **YES**

- `LoginFormLazy` — present
- `LoginPostAuthRedirectLazy` — present
- `GlobalLoadingQueryBridge` — gestionale layout only
- `DeferredPwaBridges` — gestionale layout only
- `app-providers-core` — no bridges

## Independent fixes preserved

- [`src/lib/auth/map-auth-user.ts`](src/lib/auth/map-auth-user.ts) — `@/lib/rbac`
- [`lib/rbac/fetch-rbac-role-key.ts`](lib/rbac/fetch-rbac-role-key.ts) — `@/lib/rbac`

## Gates (prod-candidate worktree)

| Gate | Result |
|------|--------|
| TSC | **PASS** |
| BUILD | **PASS** |
| PERF regression | **PASS** (0 failures) |
| public-surfaces-perf-policy | **PASS** |

## Post-revert routes

| Route | KB |
|-------|-----|
| `/login` | 1816.5 |
| `/` | 1816.5 |
| `/dashboard` | 2009.1 |
| Global | 2073.9 |

## Artifacts

- [`revert/v93-file-inventory.csv`](revert/v93-file-inventory.csv)
- [`revert/independent-fixes.md`](revert/independent-fixes.md)
- [`revert/four-way-compare-notes.md`](revert/four-way-compare-notes.md)
