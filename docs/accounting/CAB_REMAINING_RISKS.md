# CAB Remaining Risks (Pre-Aruba)

Unresolved issues after audit + target deploy (2026-09-10). Resolved items are in `CAB_PRE_ARUBA_CHANGELOG.md`.

**TARGET DEPLOYMENT = VERIFIED**

---

## P0 — Must fix before gate

### ~~R-P0-01 — fiscal_validity direct UPDATE bypass~~

**Status:** **FIXED on target** — `20270312120000` applied and verified

### ~~R-P0-02 — FASE 3–10 migrations not deployed~~

**Status:** **FIXED** — see `CAB_TARGET_PRODUCTION_GATE_REPORT.md`  
**P0-DEP-01: FIXED**

---

## P1 — Critical

### ~~R-P1-01 — apply_sdi_event over-privileged~~

**Status:** **FIXED on target** — service_role only

### R-P1-02 — Multi-tenant invoice IDOR

**Status:** **REMEDIATED in repo + target** — `invoice_assert_tenant_access`  
**Residual:** no live exploit test with two tenants in gate session

### ~~R-P1-03 — invoice_insert_event actor spoofing~~

**Status:** **FIXED on target**

### ~~R-P1-04 — TypeScript build failures~~

**Status:** **FIXED** — `npm run ci:tsc` PASS

### R-P1-05 — Client/server total drift

**Impact:** User sees totals ≠ emitted document until save.  
**Fix:** Revalidate on save via server RPC response; or disable client KPI until server round-trip.

### R-P1-06 — Aruba API contract unverified

**Impact:** LIVE submission failures, wrong auth.  
**Fix:** CAB-Aruba technical workshop; update `aruba-provider.server.ts` paths.  
**Status:** **OPEN (P1-OPS-01)**

---

## P2 — High

| ID | Risk | Mitigation |
|----|------|------------|
| ~~R-P2-01~~ | Draft totals direct UPDATE | **FIXED** — emitted totals trigger on target |
| ~~R-P2-02~~ | Client snapshot INSERT | **FIXED** — RLS SELECT-only on target |
| ~~R-P2-03~~ | Webhook service_key Bearer | **FIXED** in repo |
| R-P2-04 | FASE 2 spec DRAFT | Commercialista review |
| R-P2-05 | Storage ≠ conservazione a norma | External LTA provider decision |
| ~~R-P2-06~~ | Legacy migration MAX+1 in history | F6 deployed; legacy path inactive |
| R-P2-07 | Linux production build unverified | Confirm in CI/Vercel |
| R-P2-08 | FASE 11 E2E not run on prod | Controlled draft→XML test |

---

## P3 — Medium

| ID | Risk |
|----|------|
| R-P3-01 | Simulator fallback in prod cron if env unset |
| R-P3-02 | Webhook dedup without notification_id |
| R-P3-03 | Bollo rules not automated |
| R-P3-04 | UI filter `in_riconciliazione` incomplete |

---

## UNKNOWN — Requires external decision

| ID | Topic | Authority |
|----|-------|-----------|
| U-01 | FASE 2 fiscal policy (12-day rule, bollo thresholds) | Commercialista |
| U-02 | Conservazione sostitutiva provider | CAB legal/ops |
| U-03 | TD02/TD03 acconto business need | CAB management |
| U-04 | Aruba polling interval / rate limits | Aruba contract |
| U-05 | Split payment / specific N6 reverse charge casistiche | Commercialista |

---

## Accepted / Documented (not bugs)

| Item | Justification |
|------|---------------|
| Client VAT preview in wizard | UX; DB authoritative on emit |
| ordini-fornitori `iva_percent` default 22 | Separate module; not ciclo attivo |
| preventivo PDF hardcoded 22% | Non-fiscal document |
| UnoERP removal | `20261404120000_remove_unoerp.sql` applied |
| Auto accounting post from invoice disabled | By design FASE 3 |

---

## Risk Acceptance

P0 cleared for Pre-Aruba core. P1-OPS-01 blocks Aruba API phase. Gate: **PASS_WITH_DOCUMENTED_RISKS**.
