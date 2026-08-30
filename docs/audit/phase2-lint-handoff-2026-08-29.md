# Fase 2 — Global Lint Cleanup Handoff

**Baseline date:** 2026-08-29  
**Source:** Release Gate Freshness Audit Fase 0 + Fase 1  
**Contract:** [`release-gate-contract.md`](../release-gate-contract.md)

---

## Affidabile per Fase 2 (partire da qui)

| Gate | Role in Fase 2 |
|------|----------------|
| `flex:eslint:gate` + `flex:freeze:gate` | Enforced subset on legacy PR path — keep green while fixing full lint |
| `governance.release.contract` | Prevents contract drift while changing lint policy |
| `governance.control.review` | Registry/catalog integrity |
| `ux:enforce` | UX API bans — independent of ESLint |
| `release-gate-contract.json` | SSOT for when full lint becomes RELEASE_READY |

---

## Lint debt inventory

| Path | Policy | Fase 2 action |
|------|--------|---------------|
| `npm run lint` | ~400 legacy violations | Primary Fase 2 scope |
| `control:pr` `runtime.performance.lint` | Blocker in CP only | Align after debt reduction |
| `release-gate-nightly` | Advisory full lint | Trend tracking |

**Do not** disable `runtime.performance.lint` in Control Plane until debt is below agreed threshold documented in contract amendment.

---

## Gates that failed at baseline (do not use as Fase 2 exit criteria alone)

- `ci:tsc` — product TS errors (separate track from lint)
- `audit:ui` — design audit blockers (native title, prevTableTd)
- `test:rbac:hardening` — RBAC call-site violations

---

## Recommended Fase 2 sequence

1. Export `npm run lint` output to `docs/audit/lint-debt-2026-08-29.txt` (frozen snapshot).
2. Fix violations by category (tooltip native title, list tokens, import order).
3. When `npm run lint` passes locally, propose contract amendment to add full lint to legacy `release-gate` (optional) or keep CP-only until cutover.
4. Re-run `release-ready-contract.test.ts` after any contract change.

---

## Commands

```bash
npm run lint 2>&1 | tee docs/audit/lint-debt-snapshot.txt
npx tsx lib/control/release-ready-contract.test.ts
npm run flex:eslint:gate
```

**Do not** use pre-2026-08-29 audit docs as baseline — use [`release-gate-baseline-2026-08-29.json`](./release-gate-baseline-2026-08-29.json).
