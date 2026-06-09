# Gate matrix — CI/CD release (SSOT)

**Data:** 2026-06-08  
**Autorità merge/deploy:** [`release-gate`](.github/workflows/release-gate.yml) su PR e push `main`.

---

## Tier overview

| Tier | Workflow | Trigger | Blocking | Target duration |
|------|----------|---------|----------|-----------------|
| **1 — PR** | `release-gate` | PR + push `main` | Sì | 10–14 min (cap 30) |
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
| `ci:smoke:preflight` (creds + DB fail-fast) | blocking | blocking | — |
| `smoke:playwright` (spec 01–12) | blocking | — | — |
| `smoke:playwright:scheda-smoke` (spec 13 desktop full flow) | blocking | — | — |
| `smoke:playwright:ricambio:smoke` (spec 14) | blocking | — | — |
| `smoke:playwright:ios-smoke` / cert (spec 13 iOS combobox) | — | blocking | — |
| `smoke:playwright:ricambio:cert` | — | blocking | — |
| `smoke:cleanup` (post-Playwright, apply) | blocking | blocking | — |
| `audit:smoke:residues` (advisory; strict opzionale) | — | advisory* | — |
| `ops:long-session-soak:threshold` | — | blocking | — |
| `ops:long-session-soak` (full) | — | — | advisory |
| `npm run lint` | — | — | advisory |

\* `ci:supabase:publication` richiede `SUPABASE_DB_URL` per check live; con `PUBLICATION_CHECK_STRICT=0` passa con warning se URL assente (static SSOT).

\* `audit:smoke:residues`: advisory di default (`continue-on-error`). Soglia operativa default **5** entità (`SMOKE_RESIDUE_OPERATIVE_THRESHOLD`). Con `SMOKE_RESIDUE_STRICT=1` il job cert fallisce se il totale operativo supera la soglia. `log_modifiche` è informativo e non entra nel totale.

---

## Certificazione livello A (Production Certified)

Requisiti oggettivi:

1. `release-gate` green su `main` per almeno **2 run consecutive** post-consolidamento.
2. `release-gate-cert` green incluso `smoke:playwright:cert` (iOS combobox).
3. `audit:smoke:residues` con totale operativo **≤ 5** dopo cleanup (default soglia).
4. Nessun blind spot **P0** aperto (iOS combobox cert stabile o ripristinato in PR con fix product).

Stato attuale validazione: **B — Conditionally Stable** (vedi [`audit-release-gate-validation-2026-06.md`](./audit-release-gate-validation-2026-06.md)).

Piano uplift 82→90+: [`uplift-production-readiness-82-to-90.md`](./uplift-production-readiness-82-to-90.md).

## Gap residui — chiusura

| Gap | PR | Cert | Nightly |
|-----|----|------|---------|
| Spec 13 iOS combobox E2E | — (cert-only) | `smoke:playwright:cert` | — |
| Spec 13 desktop full flow | `smoke:playwright:scheda-smoke` | — | — |
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
