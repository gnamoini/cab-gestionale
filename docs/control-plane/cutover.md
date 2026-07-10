# Control Plane — Cutover (Final Execution Fase 0–8)

**Stato:** Fase 1 PASS (strict smoke CI 2026-07-10) — Fase 2 pilot in corso  
**Doc:** [README](./README.md) · [final-cutover-report.md](./final-cutover-report.md) · [ADR-001](../adr/ADR-001-control-plane-architecture.md)

---

## Workflow map (correzione preflight)

| Componente | Path |
|------------|------|
| `release-gate` job | [`.github/workflows/release-gate.yml`](../../.github/workflows/release-gate.yml) |
| `control-pr-shadow` job | stesso file (non esiste `control-pr-shadow.yml`) |
| `control-pr` | [`.github/workflows/control-pr.yml`](../../.github/workflows/control-pr.yml) |
| `control-cert` | [`.github/workflows/control-cert.yml`](../../.github/workflows/control-cert.yml) |

---

## Fase 0 — Preflight (locale)

```bash
npm run control:cutover-preflight
```

Output atteso:

```
CONTROL_PLANE_PREFLIGHT:
- architecture: PASS
- tooling: PASS
- workflows: PASS
- ready_for_strict_smoke: PASS
```

---

## Fase 1 — Strict smoke CI (evidence)

| Campo | Valore |
|-------|--------|
| PR | #1 |
| SHA | `00ebbbd` |
| control-pr run | `29126194905` |
| strict-label-validation | `approved: true` (admin) |
| controlMode | shadow=strict, coverage=strict, trigger=label |
| verify-strict-artifacts | PASS |
| workflow conclusion | failure (tier blockers pre-CI-fix) — strict path contract PASS |

---

```bash
npm run control:create-strict-label   # gh auth + maintainer
```

1. PR interna branch `cutover-smoke/*` (non fork)
2. Applicare label **`control-plane-strict`** (solo maintainer)

### Verifica artifact (post-run)

Scaricare artifact `control-report-pr-{run_id}` e:

```bash
npm run control:verify-strict-artifacts -- ./path/to/artifact
```

Atteso in `control-report.json`:

```json
{
  "controlMode": {
    "shadow": "strict",
    "coverage": "strict",
    "trigger": "label",
    "strictLabelApproved": true
  }
}
```

**Local path test (senza CI):** `npx tsx lib/control/strict-path-local.test.ts`

**Stop:** se `controlMode.shadow !== "strict"` → non avviare pilot.

---

## Pilot Results

Compilare dopo Fase 2 (5 PR interne strict, 0 failure su strict steps).

| PR | SHA | strict | result | duration | control-pr run id |
|----|-----|--------|--------|----------|-------------------|
| #2 | `48c6741` | yes | PASS (tier) | 3m13s | 29128286725 |
| #2 | `ff17a07` | yes | pending | — | 29130212620 |
| pilot/3 | — | — | pending | — | — |
| pilot/4 | — | — | pending | — | — |
| pilot/5 | — | — | pending | — | — |

Target: **5/5 PASS**

---

## Fase 3 — Ramp 20 SHA

```bash
npm run control:cutover-ramp-gate -- --limit=20
```

Gate: 20 SHA consecutive green, `unexpectedNewFailures=0`, duration ratio ≤1.2, control-pr p50 ≤15m, owner 100%.

---

## Freeze Window

| Campo | Valore |
|-------|--------|
| Inizio | _PENDING_ |
| Fine | _PENDING_ (24–48h dopo inizio) |
| Operatore | _PENDING_ |

Durante freeze **vietato:** new control IDs, registry/workflow/branch protection changes, P0/P1 reclassification.

**Allowed:** bugfix cutover, docs, observability, cutover tooling fixes.

---

## Rollback rehearsal log

| Campo | Valore |
|-------|--------|
| Data | _PENDING_ |
| Operatore | _PENDING_ |
| Tempo ripristino (min) | _PENDING_ (target <10) |
| Esito | PENDING |
| Note | Branch `cutover-rehearsal/*`; fail intenzionale control-pr; release-gate fallback verificato |

### Checklist rehearsal

- [ ] `control-pr` fail intenzionale su PR test
- [ ] `release-gate` ancora required e funzionante
- [ ] Vercel Deployment Protection OK
- [ ] Ripristino < 10 minuti documentato

---

## Branch protection — C1

**Solo dopo Fase 1–5 PASS.**

| | |
|-|-|
| Prima | `required: release-gate` |
| Dopo | `required: control-pr` + `release-gate` |
| Durata minima | **10 giorni lavorativi** |
| Inizio C1 | _PENDING_ |
| Fine C1 | _PENDING_ |

Monitoraggio: failure rate, duration p95, shadow mismatch, flake.

---

## Branch protection — C2

**Solo dopo C1 stabile 10 giorni lavorativi.**

| | |
|-|-|
| Required | `control-pr` only |
| `release-gate` | `workflow_dispatch` only |
| Data C2 | _PENDING_ |

Vercel: aggiornare check name se punta a `release-gate`.

---

## Emergency rollback (< 10 minuti)

1. Branch protection: rimuovere required `control-pr`
2. Riabilitare `release-gate` come required
3. Rimuovere label `control-plane-strict` o `CONTROL_SHADOW_STRICT=0`
4. Conservare artifact per postmortem

---

## Sequenza completa

```
F0 preflight → F1 strict smoke → F2 pilot 5 → F3 ramp 20
  → F4 freeze 24-48h → F5 rollback rehearsal → F6 C1 → F7 C2 → F8 cleanup
```

---

## Comandi

```bash
npm run control:cutover-preflight
npm run control:create-strict-label
npm run control:verify-strict-artifacts -- ./artifacts
npm run control:cutover-ramp-gate -- --limit=20
npm run control:shadow-report -- --gate --limit=20
npm run control:duration:baseline
npx tsx lib/control/control-owner.test.ts
npx tsx lib/control/strict-path-local.test.ts
```

---

## Cleanup (Fase 8 — post-C2 only)

- Job duplicati `release-gate.yml`
- Alias npm `release:gate`
- Archivio `docs/release-gate.md`, `docs/gate-matrix.md`

**Non eseguire prima di C2.**
