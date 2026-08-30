# Gate matrix — CI/CD release (SSOT)

**Data:** 2026-08-29  
**Autorità merge/deploy:** [`release-gate`](.github/workflows/release-gate.yml) su PR e push `main`.  
**Contratto:** [`release-gate-contract.md`](./release-gate-contract.md)

---

## Tier overview

| Tier | Workflow | Trigger | Blocking | Target duration |
|------|----------|---------|----------|-----------------|
| **1 — PR** | `release-gate` | PR + push `main` | Sì | 15–25 min |
| **1b — PR shadow** | `control-pr` | PR | No (conforming) | 20–40 min |
| **2 — Cert** | `release-gate-cert` + `control-cert` | push `main`, weekly | Sì su `main` | 25–45 min |
| **3 — Nightly** | `release-gate-nightly` + `control-observe` | daily 02:00 UTC | No | 60+ min |

---

## Distribuzione test (PR tier 1)

| Suite | PR `release-gate` | `control-pr` | Cert | Nightly |
|-------|-------------------|--------------|------|---------|
| `ci:tsc`, `ci:build` | blocking | blocking | — | — |
| `test:rbac` + `test:rbac:hardening` | blocking | via suites | — | — |
| `test:security:remediation` | blocking | blocking | — | — |
| `production:check` | blocking | blocking | — | — |
| `ci:supabase:publication` (sanity) | blocking | blocking | — | — |
| `smoke:structural` + `smoke:regression:core` (278) | blocking | P0 only (79) | — | — |
| `flex:eslint:gate` + `flex:freeze:gate` | blocking | blocking | — | — |
| `release-ready-contract` | blocking | via governance | — | — |
| `ci:smoke:preflight` | blocking | — | blocking | — |
| `smoke:playwright` (spec 01–12) | blocking | skipped (`SMOKE_SKIP`) | — | — |
| Spec 13/14 E2E | — | — | blocking | — |
| `npm run lint` (full) | — | blocking | — | advisory |
| `smoke:regression:extended` | — | — | blocking | advisory |
| `ci:supabase:publication:full` | — | — | blocking | — |
| `ops:long-session-soak:threshold` | — | — | blocking | — |
| `smoke:cleanup` (apply) | blocking | — | blocking | — |

---

## Regression counts (2026-08-29)

| List | Count |
|------|-------|
| `REGRESSION_CORE` | 278 |
| `REGRESSION_EXTENDED` | ~210 |
| `REGRESSION_P0` | 79 |
| Control Plane controls | 84 |

CORE ≠ P0. Relationship documented in release contract.

---

## Secrets GitHub Actions

| Secret | Uso |
|--------|-----|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | DB readiness, Playwright |
| `SMOKE_ADMIN_*`, `SMOKE_OPERATOR_*`, `SMOKE_DOCUMENTI_LAVORAZIONE_ID` | E2E |
| `SUPABASE_DB_URL` (opzionale) | Publication live |

---

## Branch protection

1. **Required:** `release-gate` su PR verso `main`.
2. **Required su `main`:** `release-gate-cert` dopo merge.
3. Vercel: solo `next build` dopo Deployment Protection.

Vedi [`release-gate.md`](./release-gate.md), [`release-gate-contract.md`](./release-gate-contract.md).
