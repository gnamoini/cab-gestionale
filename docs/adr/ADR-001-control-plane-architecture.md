# ADR-001: Control Plane Architecture

**Status:** Accepted  
**Date:** 2026-07-10  
**Deciders:** Platform / Engineering  
**Baseline:** Control Plane v3.1

---

## Context

Il gestionale CAB accumula ~25 script gate, 3 workflow CI, 346 regression test, e controlli runtime distribuiti (RBAC, design, production readiness). Problemi osservati:

- Drift documentazione ↔ CI (spec E2E, conteggi test)
- Duplicazione RBAC e design in CI
- Nessun lifecycle per controlli obsoleti
- Certificazione manuale non riproducibile
- Naming incoerente (`gate`, `audit`, `policy`, `cert`)

Serve un **governance layer** senza trasformare il sistema di controllo nel componente più complesso del progetto.

---

## Decision

Introduciamo una **Control Plane** con:

1. **Registry minimale** (`lib/control/registry.ts`) — solo metadati governance
2. **Catalog** (`lib/control/catalog.ts`) — risoluzione implementazione
3. **Executor idempotente** (`lib/control/executor.ts`) — orchestrazione per tier
4. **6 domini:** security, data, design, domain, runtime, governance
5. **Tier esecuzione:** local → pr → staging → cert → production → observe
6. **Outcome estesi:** pass, fail, warning, skipped, unknown, blocked
7. **Certificazione** su GitHub Artifact (non commit repo)
8. **Self-governance:** `governance.control.review` come PR blocker

```
Control ≠ test
Control = static | runtime | test-suite | manual
```

---

## Alternatives considered

### A. Mantenere gate separati (status quo)

- **Pro:** zero migrazione
- **Contro:** drift continuo, duplicazione, nessun lifecycle

### B. Mega framework unico eseguibile

- **Pro:** un entrypoint
- **Contro:** coupling, registry diventa DB di tutto, stesso fallimento dei policy engine monolitici

### C. Policy engine (OPA/Cedar/custom)

- **Pro:** regole dichiarative potenti
- **Contro:** overengineering per team size attuale; YAGNI

### D. Control Plane (scelta)

- **Pro:** separazione governance/impl, estensibile, audit-friendly
- **Contro:** migrazione incrementale richiesta (shadow mode)

---

## Consequences

### Positive

- Registry umana (<200 righe)
- `unknown` vs `fail` per audit ISO/clienti pubblici
- Dependency graph per fail-fast e blast radius
- Shadow migration riduce rischio cutover
- Regression P0–P3 per PR veloce

### Negative

- Periodo transizione con workflow legacy + control-* in parallelo
- Team deve imparare tier vs "release gate"
- Inventory e registry vanno mantenuti

### Neutral

- `release-gate.yml` resta alias fino a Sprint 4 cutover
- `docs/gate-matrix.md` transiziona a `docs/control-matrix.md` generato

---

## Compliance

- Certificazione: bundle immutabile con `checksums.json` su GitHub Artifact (retention 5 anni target)
- RBAC: defense in depth invariata (DB RLS → server → proxy → client guard UX)
- Nessun secret in `control-report.json` / `certification.json`

---

## Implementation sprints

| Sprint | Deliverable |
|--------|-------------|
| 0 | Questo ADR + `docs/control-plane/README.md` |
| 1 | `control-inventory.json` |
| 2 | `lib/control/*` foundation |
| 3 | Shadow CI job |
| 4 | Cutover workflows |
| 5 | Health dashboard, P0 tuning, cleanup |

---

## References

- [Control Plane README](../control-plane/README.md)
- Audit sistemico 2026-07 (piano v3.1)
