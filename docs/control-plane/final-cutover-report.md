# Control Plane — Final Cutover Report

**Generated:** template — aggiornare al completamento di ogni fase  
**Playbook:** [cutover.md](./cutover.md)

---

## Control Plane Final Status

| Gate | Status | Evidence |
|------|--------|----------|
| Architecture | PASS | `npm run control:cutover-preflight` (Fase 0) |
| Implementation | PASS | Sprint 6–8 + Readiness Ops v3 in repo |
| Strict validation (CI) | PENDING | Fase 1 — artifact `controlMode.shadow=strict` |
| Pilot 5 PR | PENDING | Fase 2 — tabella Pilot Results in cutover.md |
| Ramp 20 SHA | PENDING | Fase 3 — `control:cutover-ramp-gate` |
| Freeze window | PENDING | Fase 4 — date in cutover.md |
| Rollback rehearsal | PENDING | Fase 5 — log <10 min |
| Branch protection C1 | PENDING | Fase 6 — 10 giorni lavorativi |
| Branch protection C2 | PENDING | Fase 7 |
| Cleanup post-C2 | PENDING | Fase 8 |

---

## Fase 0 — Preflight

```
CONTROL_PLANE_PREFLIGHT:
- architecture: PASS
- tooling: PASS
- workflows: PASS
- ready_for_strict_smoke: PASS
```

Comando: `npm run control:cutover-preflight`

### Release gate reconciliation (2026-08-29)

- **RELEASE_READY contract:** [`docs/release-gate-contract.md`](../release-gate-contract.md) + machine-readable JSON
- **Conformance gate:** `governance.release.contract` (84 controls)
- **Legacy alignment:** `test:security:remediation` + `release-ready-contract` added to `release-gate.yml`
- **CORE vs P0:** 278 vs 79 — documented, not assumed equivalent
- **Shadow compare:** run `npm run control:shadow-compare` after next green CI cycle


---

## Fase 1 — Strict smoke CI

- [ ] Label `control-plane-strict` creata (`npm run control:create-strict-label`)
- [ ] PR interna `cutover-smoke/*` con label
- [ ] Artifact verificati: `npm run control:verify-strict-artifacts -- ./artifact-dir`

**Local strict path:** `npx tsx lib/control/strict-path-local.test.ts` PASS

---

## Fase 2 — Pilot 5 PR

Vedi [Pilot Results](./cutover.md#pilot-results) — target **5/5 PASS**.

---

## Fase 3 — Ramp 20 SHA

```bash
npm run control:cutover-ramp-gate -- --limit=20
```

---

## Fasi 4–8

Documentate in [cutover.md](./cutover.md): Freeze Window, Rollback rehearsal log, C1/C2 branch protection, Cleanup.

---

## Final status

```
CONTROL_PLANE_PRODUCTION_READY: PENDING
```

**Fase 0 completata in repo:** `npm run control:cutover-preflight` PASS (include `strict-path-local`).

**Fasi 1–7:** richiedono maintainer su GitHub (`gh` CLI, label, PR, branch protection). Usare script e checklist in [cutover.md](./cutover.md).

Promuovere a **CONTROL_PLANE_PRODUCTION_READY** solo quando tutte le righe sopra sono PASS con evidenza audit (SHA, run-id, date operatore).
