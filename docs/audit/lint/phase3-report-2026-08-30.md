# Fase 3 — Lint Debt Finalization (2026-08-30)

## Analisi

| Fase | Errori | Warning | File con finding |
|------|--------|---------|------------------|
| Fase 2 (ref) | 0 | 260 | 155 |
| F3-start (actual) | 0 | 260 | 155 |
| F3-final | **0** | **0** | **0** |

**Delta:** −260 warning risolti, 0 errori introdotti (dopo fix regressione React 19 rules).

### File coinvolti (wave principali)

- Wave 3A: `no-unused-vars` — ~129 file, import/locals/destructuring omit
- Wave 3B: `exhaustive-deps` — 5 file target + follow-up repo-wide
- Wave 3C: tooltip, img, a11y, direct-ds-import, incompatible-library
- Dirty sentinel: `magazzino-view`, `documenti-view`, `documenti-modals`, `lavorazioni-view`

### `.remediation/` scope gate

- **In scope** ESLint (non in `globalIgnores`)
- Finding in `migration-alignment-plan.ts` risolto (SAFE_REMOVE)

---

## Implementazione

### Tooling (`scripts/lint-phase3-tools.ts`)

| Comando npm | Azione |
|-------------|--------|
| `lint:phase3:start` | Snapshot F3-start + diff baseline |
| `lint:phase3:inventory` | Inventory classificato |
| `lint:phase3:dirty-check` | Sentinel diff vs F3-start |
| `lint:phase3:summary` | Conteggi vs baseline |
| `lint:phase3:final` | JSON finale + disable audit |

### Wave 3A — `no-unused-vars`

Rimozione import morti, omit destructuring, eliminazione helper/icon inline non usati. Nessun `_prefix` (non silenzia la regola).

### Wave 3B — `exhaustive-deps`

Fix isolabili (deps ridondanti) o disable motivato su contratti hook stabili.

### Wave 3C — altri warning

Pattern repo: `flex-nowrap sm:flex-wrap`, disable img data-URL, a11y, direct-ds-import.

### Disable audit

| Metrica | Fase 2 ref | F3-final |
|---------|------------|----------|
| Totale disable | ~220 | 327 |
| File-wide | — | 47 |
| Unexplained | — | **0** |

Aumento disable vs F2: nuovi file dirty + F3 restore React 19 hook disables su `lavorazioni-view`. Non usato come proxy automatico di instabilità — tutti motivati.

---

## Verifica

| Controllo | Esito |
|-----------|-------|
| `npm run lint` (×2) | **PASS** — 0E / 0W, output identico |
| `lint:phase3:dirty-check` | **PASS** — 775 snapshot, 0 fail |
| `flex:eslint:gate` | **PASS** |
| `release-ready-contract.test.ts` | **PASS** |
| `ci:tsc` | **FAIL** — PRE_EXISTING su dirty tree (non introdotto da F3 lint) |

### LINT_STABILITY (solo ESLint)

**HIGH** — 0 warning, 0 unexplained disable, repeatability OK.

### PHASE3_REGRESSION_SAFETY

| Asse | Esito | Classificazione |
|------|-------|-----------------|
| ESLint | PASS | — |
| tsc | FAIL | PRE_EXISTING (dirty tree) |
| contract | PASS | — |
| flex gate | PASS | — |
| dirty-check | PASS | — |

---

## Decisione gate

**`LINT_CLEAN`** — criteri lint Fase 3 soddisfatti.

**`NOT_READY_FOR_HARD_GATE`** — promozione `release-gate.yml` bloccata da `ci:tsc` PRE_EXISTING sul working tree dirty. Lint-only promotion non autorizzata dal piano Fase 3 senza sign-off regression completo.

Nessun `phase3-gate-promotion-*.md` (non READY).

---

## Artifact

```
docs/audit/lint/
├── phase2-baseline-2026-08-29.json
├── phase2-report-2026-08-29.md
├── phase3-start-2026-08-30.json
├── phase3-inventory-2026-08-30.json
├── phase3-final-2026-08-30.json
├── phase3-report-2026-08-30.md          ← questo file
└── phase3-start-diffs/                  ← 775 snapshot
```

Report Fase 2 immutato: [`docs/audit/lint-cleanup-2026-08-29.md`](../lint-cleanup-2026-08-29.md)

---

## Rischi residui

1. **tsc** — risolvere su branch prodotto prima di hard gate
2. **Disable count +107 vs F2** — monitorare in Fase 4; tutti con reason
3. **Dirty tree** — F3 lint su snapshot diff; merge prodotto richiede re-run lint
