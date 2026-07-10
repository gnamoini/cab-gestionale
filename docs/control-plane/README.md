# Control Plane — Governance

**Versione:** 1.0 (Sprint 0 freeze)  
**Baseline:** Control Plane v3.1  
**ADR:** [ADR-001-control-plane-architecture.md](../adr/ADR-001-control-plane-architecture.md)

---

## Cos'è un Control

Un **Control** è un meccanismo verificabile che protegge un invariante del gestionale (sicurezza, integrità dati, design, dominio, runtime, governance).

Un Control **non è** necessariamente un test. Può essere:

| Tipo | Esempio |
|------|---------|
| Static check | `ci:tsc`, `audit:ui` |
| Runtime check | RLS Postgres, `server-permission-guards` |
| Test suite | regression P0, `test:rbac` |
| Manual verification | checklist pre-deploy documentata |

---

## Cos'è il Control Plane

Il Control Plane è il **governance layer** che cataloga, orchestra e riporta i controlli. Non sostituisce le implementazioni nei domini.

```
registry.ts   → metadati governance (cosa è il controllo)
catalog.ts    → come risolvere l'implementazione
executor.ts   → esecuzione per tier
```

**Regola:** `registry.ts` resta leggibile (<200 righe). Liste test, regex, glob e parametri vivono in `catalog.ts`, `suites/` o script di dominio.

---

## Domini

| Dominio | Scope |
|---------|-------|
| `security` | Auth, RBAC, RLS, input validation |
| `data` | Env, migrations, publication, storage |
| `design` | UI SSOT, modal, table, flex, mobile |
| `domain` | Business rules, import/export, document capture |
| `runtime` | E2E, soak, performance (`runtimeCategory`: correctness \| reliability \| performance) |
| `governance` | Registry parity, docs drift, classification regression |

---

## Tier di esecuzione

| Tier | Comando | Blocking |
|------|---------|----------|
| LOCAL | `npm run control:local` | locale |
| PR | `npm run control:pr` | merge |
| STAGING | `npm run control:staging` | staging deploy |
| CERT | `npm run control:cert` | main |
| PRODUCTION | `npm run control:production` | prod deploy |
| OBSERVE | `npm run control:observe` | telemetry only |

Il **gate** è solo un **risultato** (`pass` / `fail` / …), non il nome del sistema.

Workflow legacy (`release-gate`) restano alias fino a cutover completo.

---

## Severity e outcome

### Severity (registry)

| Valore | Significato |
|--------|-------------|
| `blocker` | Deve passare nel tier assegnato |
| `warning` | Annotazione; non blocca tier |
| `info` | Telemetria |

### Outcome (report)

| Outcome | Significato |
|---------|-------------|
| `pass` | Controllo eseguito, invariante rispettato |
| `fail` | Controllo eseguito, violazione confermata |
| `warning` | Violazione non bloccante |
| `skipped` | Non eseguito (sunset, disabled, tier non applicabile) |
| `unknown` | Non eseguibile (env unavailable, infra timeout) — **non** equivale a `fail` |
| `blocked` | Dipendenza upstream fail/unknown |

**Audit:** Supabase irraggiungibile → `unknown`, non `fail`.

---

## Lifecycle

```
experimental → active → deprecated → sunset → removed
```

| Status | Comportamento executor |
|--------|------------------------|
| `active` | Esecuzione normale |
| `experimental` | Esegue; fail → warning |
| `deprecated` | Esegue + warning deprecation; richiede `sunsetDate` |
| `sunset` | Skip (`skipped`) |
| `disabled` | Skip (incident / flag) |

---

## Ownership

Owner ammessi (`ControlOwner` enum in `lib/control/owners.ts`):

`platform` | `security` | `frontend` | `backend` | `database` | `devops` | `domain-owner`

Niente stringhe libere in registry.

---

## Naming

Control ID: `{domain}.{artifact}.{action}`

Esempi: `security.rbac.matrix`, `design.modal.width`, `governance.control.review`

---

## Cosa NON può entrare in registry

- Liste di file test
- Regex o glob
- Parametri numerici (soglie soak, threshold residue)
- Script inline o import di implementazione
- Eccezioni per singoli file

Questi appartengono a `catalog.ts`, `lib/control/suites/`, o moduli di dominio.

---

## Processo aggiunta controllo

1. Verificare che l'invariante non sia già coperto (`control-inventory.json`)
2. Aggiungere entry in `lib/control/registry.ts` (governance)
3. Aggiungere risoluzione in `lib/control/catalog.ts` o suite
4. `dependsOn` se necessario (grafo aciclico)
5. `governance.control.review` deve passare (PR blocker)
6. PR con owner del dominio come reviewer

---

## Versioning

| Costante | Cosa versiona |
|----------|---------------|
| `CONTROL_CONTRACT_VERSION` | Schema `ControlDefinition`, `ControlResult`, report JSON |
| `CONTROL_REGISTRY_VERSION` | Insieme controlli registrati |

Cambio schema → bump contract. Nuovo controllo → bump registry (minor).

---

## Anti-pattern

- `registry.add("checkEverything")` — un controllo = un invariante misurabile
- Duplicare lo stesso controllo in registry e script senza catalog reference
- `fail` quando l'ambiente non è disponibile — usare `unknown`
- Commit automatici di certificazione nel repo — usare GitHub Artifact
- Mettere implementazione in `registry.ts`

---

## Artifact e inventory

| File | Ruolo |
|------|-------|
| `control-inventory.json` | Inventario machine-generated (Sprint 1) |
| `control-report.json` | Output per run tier |
| `control-certification/{runId}/manifest.json` | Multi-hash integrity (controls, registry, catalog, suite) |
| `shadow-policy-report.json` | Shadow legacy vs control policy |
| `docs/control-matrix.md` | Matrice generata da registry |
| `docs/control-plane/cutover.md` | Fase A/B cutover e emergency rollback |

`control-inventory.json` è generato da `npm run control:inventory`. Default: **gitignored** (vedi `.gitignore`). Baseline opzionale: `control-inventory.baseline.json` per `control:inventory-drift`.

---

## Riferimenti

- [ADR-001](../adr/ADR-001-control-plane-architecture.md)
- [gate-matrix.md](../gate-matrix.md) (legacy, in transizione)
- [release-gate.md](../release-gate.md) (legacy, in transizione)
- [cutover.md](./cutover.md) — Fase 0–8 cutover execution
- [final-cutover-report.md](./final-cutover-report.md) — status gate finale
