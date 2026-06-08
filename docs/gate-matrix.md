# Gate matrix — CI/CD release (SSOT)

**Data:** 2026-06-08  
**Autorità merge/deploy:** [`release-gate`](.github/workflows/release-gate.yml) su PR e push `main`.

---

## Tier overview

| Tier | Workflow | Trigger | Blocking | Target duration |
|------|----------|---------|----------|-----------------|
| **1 — PR** | `release-gate` | PR + push `main` | Sì | 12–18 min (cap 30) |
| **2 — Cert** | `release-gate-cert` | push `main`, weekly Mon 03:00 UTC, dispatch | Sì su `main` (branch protection) | 25–40 min (cap 45) |
| **3 — Nightly** | `release-gate-nightly` | daily 02:00 UTC, dispatch | No | 60+ min |

---

## Distribuzione test

| Suite | PR | Cert | Nightly |
|-------|----|------|---------|
| `ci:tsc`, `ci:build`, `ux:*`, `ios:check` | blocking | — | — |
| `production:check` | blocking | — | — |
| `ci:supabase:publication` (sanity) | blocking* | — | — |
| `ci:supabase:publication:full` | — | blocking | — |
| `smoke:structural` + `smoke:regression:core` | blocking | — | — |
| `smoke:regression:extended` | — | blocking | advisory |
| `flex:eslint:gate` + `flex:freeze:gate` | blocking | — | — |
| `smoke:playwright` (spec 01–12) | blocking | — | — |
| `smoke:playwright:ricambio:smoke` (spec 14) | blocking | — | — |
| `smoke:playwright:ios-smoke` (spec 13 subset) | blocking | — | — |
| `smoke:playwright:cert` (spec 13 × 4 progetti) | — | blocking | — |
| `smoke:playwright:ricambio:cert` | — | blocking | — |
| `smoke:cleanup` (post-Playwright, apply) | blocking | blocking | — |
| `ops:long-session-soak:threshold` | — | blocking | — |
| `ops:long-session-soak` (full) | — | — | advisory |
| `npm run lint` | — | — | advisory |

\* `ci:supabase:publication` richiede `SUPABASE_DB_URL` per check live; con `PUBLICATION_CHECK_STRICT=0` passa con warning se URL assente (static SSOT).

---

## Gap residui — chiusura

| Gap | PR | Cert | Nightly |
|-----|----|------|---------|
| Spec 13 iOS E2E | `smoke:playwright:ios-smoke` | `smoke:playwright:cert` | — |
| Nuovo Ricambio E2E | spec 14 in `smoke:playwright` | `smoke:playwright:ricambio:cert` | — |
| Publication drift | `ci:supabase:publication` | `ci:supabase:publication:full` | — |
| Long-session soak | — | `ops:long-session-soak:threshold` | `ops:long-session-soak` |

---

## Secrets GitHub Actions

| Secret | Uso |
|--------|-----|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | DB readiness, Playwright |
| `SMOKE_ADMIN_*`, `SMOKE_OPERATOR_*`, `SMOKE_DOCUMENTI_LAVORAZIONE_ID` | E2E |
| `SUPABASE_DB_URL` (opzionale) | Publication live (`pg_publication_tables`) |

---

## Branch protection (governance)

1. **Required:** `release-gate` su PR verso `main`.
2. **Required su `main`:** `release-gate-cert` dopo merge (push main) o come second check settimanale.
3. Vercel: solo `next build` dopo Deployment Protection.

Vedi anche [`release-gate.md`](./release-gate.md), [`audit-release-gate.md`](./audit-release-gate.md).
