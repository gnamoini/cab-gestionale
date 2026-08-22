# Performance V9.4 — Settings Shared Aggregate

## Verdict: **NO_MEASURABLE_BENEFIT** (audit-only; no intervention implemented)

Trace does **not** prove ≥50 KB eliminable from `/login` or `/` first-load with a safe single intervention.

---

## Baseline (PRODUCTION-CANDIDATE, post V9.3 revert)

| Route | KB |
|-------|-----|
| `/login` | 1816.5 |
| `/` | 1816.5 |
| `/dashboard` | 2009.1 |
| Global | 2073.9 |

## Shared settings chunk

Primary application chunk: `0jzqpdoeyl4gf.js` — **365.9 raw KB**, **104.3 gzip KB**.

**Not pure settings** — co-loaded RBAC (`GESTIONALE_PAGES`, `resolvePageAccess`, `resolveEffectivePermissions`) + `AppSettings` / `app_settings`.

See [`settings-shared-chunk.md`](settings-shared-chunk.md) for full proof chain.

## Top contributors (`/login` first-load)

| Chunk | raw KB | Role |
|-------|--------|------|
| `0jzqpdoeyl4gf.js` | 365.9 | Mixed RBAC + settings aggregate |
| `0_-ofxhecoztq.js` | 232.3 | Supabase client |
| `0d.m5yg8x90g9.js` | 226.3 | react-dom / framework |
| `0ja.uucu94kw..js` | 188.2 | permissions-snapshot / gestionale-dirty labels |
| `0te757ahqt7en.js` | 107.5 | Next App Router runtime |

## Import graph

[`settings-import-graph.csv`](settings-import-graph.csv)

## Classification summary

- **ROOT_CRITICAL on `/login`:** `auth-context` → `resolveEffectivePermissions` chain (static)
- **GESTIONALE_CRITICAL:** `AppSettingsQueryProvider` → `resolve-from-rows` (not mounted on `/login`, but same shared chunk)
- **Framework:** react-dom, Next runtime — not app-fix targets

## Candidates

[`candidates.csv`](candidates.csv) — no P0 with trace-proven ≥50 KB removal.

| Prior attempt | Result |
|---------------|--------|
| V9.3 auth-context strip | +0.2 KB, REVERTED |
| V9.1 resolve-from-rows dynamic | +0.4 KB, REVERTED |

## Interventions

| # | Action | Result |
|---|--------|--------|
| 0 | Audit only | **NO IMPLEMENT** — rule: trace must prove ≥50 KB first-load win |

## Before/After

No code intervention — metrics unchanged from baseline.

## Settings functional checks

Not run (no settings code change). Post-revert gates: TSC PASS, BUILD PASS, PERF PASS.

## Remaining shared shell

~174 KB gap to 1900 budget. Dominant removable-class target remains **365.9 KB mixed aggregate** — requires bundler-level split or multi-root coordinated boundary, not single dynamic import.

## Next target

1. Investigate Turbopack/webpack `0jzqp…` chunk split configuration
2. P1: `use-permissions` / `GESTIONALE_PAGES` file split on gestionale path (est. 5–20 KB gzip — below SUCCESS threshold alone)
3. Do **not** repeat auth-context-only strip without bundler graph proof

---

## V9.3 revert summary

See [`../performance-v9.3/revert-report.md`](../performance-v9.3/revert-report.md) — **REVERTED**, V9.2 preserved, `/login` restored to **1816.5 KB**.
