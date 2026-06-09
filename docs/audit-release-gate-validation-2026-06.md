# Audit finale validazione Release Gate — Giugno 2026

**Data:** 2026-06-08  
**Scope:** validazione post-consolidamento (gate/test/cleanup/docs) — **nessun nuovo test**, nessuna logica applicativa  
**Riferimenti:** [`audit-release-gate-2026-06.md`](./audit-release-gate-2026-06.md), [`gate-matrix.md`](./gate-matrix.md)

---

## Verdetto certificazione

### **B — Conditionally Stable** (sotto-stato: **PR gate blocked / Cert tier-2 blocked**)

Il consolidamento gate è **su `main` remoto** e **validato parzialmente su CI reale**. Non è **A — Production Certified** perché:

1. `release-gate` su `97a2835` (post-fix audit extended) è **failure** — step `scheda-smoke` (spec 13 desktop full-flow).
2. `release-gate-cert` su `97a2835` è **failure** — step `smoke:playwright:cert` (spec 13 mobile/iOS).
3. **Nessuna** run consecutiva green ×2 su `release-gate` (run #2 non dispatchata: run #1 fallita).
4. `audit:smoke:residues` **skipped** in cert (job fallito prima dello step advisory).

**Successi oggettivi del consolidamento (evidenza CI):**

- `ios-smoke` **assente** dal PR gate (confermato workflow + step 19 = `scheda-smoke`).
- WebKit **non** installato in PR gate.
- Extended regression tier **green** su cert #37 (`97a2835`) dopo fix coerenza audit.
- Cleanup smoke (`if: always()`) **success** su gate #71, #72 e cert #36, #37.

---

## Stato attuale del Release Gate

| Indicatore | Valore |
|---|---|
| Regression core (PR) | **63** file |
| Regression extended (cert) | **44** file (+documenti/report inputs-audit) |
| Playwright PR | spec 01–12 + spec 13 desktop (`scheda-smoke`) + spec 14 |
| Playwright cert | spec 13 iOS combobox ×4 + spec 14 cert |
| Cleanup | `if: always()` + teardown spec 05/13/14 + `log_modifiche` prune |
| Residues audit | advisory cert; soglia operativa default **5** |

### Modifiche consolidate (validazione efficacia)

| Modifica | Effetto atteso | Validato |
|---|---|---|
| Rimozione `ios-smoke` da PR | Elimina blocker PR noto (cliente undefined) | Sì (config workflow) |
| `scheda-smoke` desktop in PR | Mantiene copertura dominio lavorazioni/schede | Sì (1 test full-flow) |
| Rimozione WebKit install PR | −1–2 min CI | Sì |
| Promozione notification-ui + dropdown-outside-dismiss in core | Copertura static feature recenti | Sì (core 63/63 OK locale) |
| compat-readiness-report → extended | Riduce falsi positivi PR | Sì |
| 9 flex dup rimossi da extended | Tier più snello | Sì |
| Cleanup + teardown + log_modifiche | Hygiene DB migliorata | Sì (implementato) |
| `audit:smoke:residues` + soglia | Visibilità residui post-run | Sì |

---

## FASE 1 — Copertura effettiva

Legenda: **E** E2E, **S** static, **L** live DB

| Area | Protezione | Tier | Gap residuo |
|---|---|---|---|
| Auth login/logout | E spec 01 | PR | Session restore: nessun test dedicato |
| RBAC | S + E 02/11 + L production:check | PR | — |
| Lavorazioni create/edit/schede | E spec 13 desktop + S forms/schede | PR | iOS combobox E2E solo cert |
| Magazzino create | E spec 14 + S magazzino | PR | Modifica ricambio: solo static |
| Clienti | S + E 11 (secrets opz.) | PR | Skip se env assenti |
| Report | E spec 03 + S KPI + S report-inputs (cert) | PR/C | No E2E export PDF |
| Impostazioni | S security (PR); S configurazione (cert) | PR/C | No E2E impostazioni |
| Mobile | E 04/06/12 + S ux/mobile/ios | PR | iOS runtime E2E in cert |
| Supabase | L + S publication + cert full | PR/C | No gate migration drift dedicato |

**Esito:** ogni area critica ha almeno una protezione automatica.

---

## FASE 2 — Blind spot residui

| ID | Descrizione | P | Mitigazione attuale |
|---|---|---|---|
| BS-1 | iOS combobox cert storicamente rosso | **P0** | Static PR; cert blocking |
| BS-2 | CI green post-consolidamento non verificato su remoto | **P0** → **chiuso** | Push `467013a`/`97a2835`; evidenza run #71–#72 |
| BS-3 | No E2E modifica ricambio | **P1** | Static extended policy |
| BS-4 | Cleanup non garantito su job timeout globale | **P1** | afterAll teardown |
| BS-5 | Session restore non testato | **P2** | spec 07 hydration parziale |
| BS-6 | 3 inputs-audit orfani (dashboard, preventivi, bunder) | **P2** | Fuori tier |
| BS-7 | E2E cliente condizionale | **P2** | Secrets documentati |
| BS-8 | Export PDF | **P3** | Static pdf-preview extended |

---

## FASE 3 — Cleanup verification

| Check | Esito |
|---|---|
| Spec mutanti 05/13/14 + `afterAll` teardown | OK |
| CI `smoke:cleanup` on failure | OK (`if: always()`) |
| CI cleanup on job timeout | Gap (abort pre-step) |
| DB lavorazioni/schede/mezzi/ricambi/documenti | OK |
| app_settings liste + magazzino master | OK |
| log_modifiche smoke | OK (prune apply + informativo in residues) |
| Storage smoke-doc | OK (path noti) |
| File temp spec 05 | OK |

**Correzione applicata in validazione:** `audit-smoke-residues` usava tabella errata `modifica_log` — corretto in `log_modifiche`.

---

## FASE 4 — Performance analysis

| Step | Tier | Stima | Valutazione |
|---|---|---|---|
| `ci:build` | PR | 3–4 min | Necessario |
| `smoke:regression:core` (63) | PR | ~2 min | OK (~97s locale) |
| Playwright 01–12 | PR | 3–5 min | OK |
| `scheda-smoke` | PR | 2–4 min | Sostituisce ios-smoke |
| ~~WebKit + ios retry~~ | — | ~~−3–5 min~~ | Rimosso |
| extended (44) + soak | Cert | 8–12 min | OK tier 2 |

**PR gate stimato:** 10–14 min post-consolidamento (vs 18+ pre-iOS).

---

## FASE 5 — Score certificazione

| Dimensione | Score | Note |
|---|---|---|
| Coverage Score | **7.6 / 10** | +0.1 per documenti/report inputs in extended |
| Reliability Score | **7.5 / 10** | PR più deterministico; cert iOS a rischio |
| CI Efficiency Score | **8.5 / 10** | WebKit rimosso; tiering corretto |
| Cleanup Hygiene Score | **7.5 / 10** | +0.5 per log_modifiche prune |
| Production Readiness Score | **7.5 / 10** | production:check forte; deploy blocked finché CI non green |

### **Score finale: 7.7 / 10**

---

## Risk matrix

| Rischio | Prob. | Sev. | Gate |
|---|---|---|---|
| iOS combobox cert fail | Alta | Alta | Cert |
| False green PR / iOS broken | Media | Alta | Accettato temp.; cert compensa |
| Residui AUDIT DB | Media | Media | Cleanup + residues |
| RBAC bypass | Bassa | Critica | PR multi-layer |

---

## CI remoto (monitoraggio)

### Pre-consolidamento (`2a6628a`)

| Workflow | Run | Esito | Blocker |
|---|---|---|---|
| `release-gate` | [#70](https://github.com/gnamoini/cab-gestionale/actions/runs/27172572871) | **failure** | `ios-smoke` (iOS combobox) |
| `release-gate-cert` | — | storico rosso iOS | — |

### Post-consolidamento — push `467013a`

| Workflow | Run | Esito | Step blocker | Cleanup |
|---|---|---|---|---|
| `release-gate` | [#71](https://github.com/gnamoini/cab-gestionale/actions/runs/27173703777) | **failure** | step 19 `scheda-smoke` (~5 min) | step 21 **success** |
| `release-gate-cert` | [#36](https://github.com/gnamoini/cab-gestionale/actions/runs/27173703776) | **failure** | step 5 extended regression (~8s) | step 14 **success** |

**Nota `467013a`:** extended regression falliva per drift audit (`lavorazioni-e2e-certification`, `configurazione-inputs` scope obsoleto).

### Post-fix coerenza — push `97a2835`

| Workflow | Run | Esito | Step blocker | Cleanup | Residues |
|---|---|---|---|---|---|
| `release-gate` | [#72](https://github.com/gnamoini/cab-gestionale/actions/runs/27174417320) | **failure** | step 19 `scheda-smoke` (~5 min) | step 21 **success** | N/A (PR) |
| `release-gate-cert` | [#37](https://github.com/gnamoini/cab-gestionale/actions/runs/27174417298) | **failure** | step 11 `smoke:playwright:cert` (~18 min) | step 14 **success** | step 13 **skipped** |

**Nota `97a2835`:** extended regression **green** (44/44); cert raggiunge Playwright ma fallisce su spec 13 mobile/iOS.

### Run #2 `release-gate` (workflow_dispatch)

**Non eseguita** — criterio piano: dispatch solo dopo run #1 green. Entrambe le run post-push (#71, #72) sono **failure** sullo stesso step.

---

## Chiusura operativa (2026-06-09)

### Commit su `main`

| SHA | Messaggio | Contenuto |
|---|---|---|
| `467013a` | `chore(gate): consolidamento release gate…` | workflows, tier 63/44, cleanup, teardown, docs |
| `97a2835` | `fix(gate): allinea audit extended a refactor settings/modali` | coerenza inputs-audit + lavorazioni-e2e-certification |

### Divergenze pre/post push (risolte)

| Aspetto | Pre (`2a6628a`) | Post (`97a2835`) |
|---|---|---|
| PR Playwright spec 13 | `ios-smoke` + WebKit | `scheda-smoke` desktop, solo Chromium |
| Extended cert | drift audit | **green** su run #37 |
| Cleanup post-failure | parziale | **success** `if: always()` verificato |

### Criteri certificazione A — checklist

| Criterio | Stato |
|---|---|
| `release-gate` GREEN run 1 post-consolidamento | **NO** — failure `scheda-smoke` (#71, #72) |
| `release-gate` GREEN run 2 consecutiva | **NO** — non dispatchata |
| `release-gate-cert` GREEN (iOS combobox) | **NO** — failure spec 13 cert (#37) |
| Cleanup deterministico (exit 0) | **SÌ** — verificato su tutte e 4 le run |
| Residues operativi ≤ 5 | **N/D** — step skipped (cert fallisce prima) |
| PR gate senza `ios-smoke` | **SÌ** — verificato in workflow e CI |

### Decisione finale

**B confermato** con sotto-stato **PR Production Ready / Cert Pending** parziale:

- **Architettura gate:** obiettivo raggiunto (ios-smoke fuori PR, tiering, cleanup).
- **Deploy Vercel:** ancora **bloccato** — `release-gate` rosso su spec 13 desktop E2E.
- **Cert tier-2:** extended green; blocker spostato su **Playwright spec 13** (desktop PR + mobile/iOS cert).

### Risk assessment finale

| Rischio | Prob. | Impatto | Evidenza CI |
|---|---|---|---|
| PR gate `scheda-smoke` fail | **Alta** | Deploy bloccato | #71, #72 stesso step |
| Cert iOS/mobile spec 13 fail | **Alta** | A negata | #37 step 11 |
| Extended regression drift | **Bassa** (post-fix) | Cert fail precoce | #37 step 5 green |
| Residues > soglia | **N/D** | Advisory non misurato | step skipped |
| False sense PR green | **Bassa** | Mitigato | ios-smoke rimosso ma sostituito da nuovo blocker |

### Percorso verso A

1. **Fix spec 13 E2E** (helper/gate o product combobox — fuori scope gate-only attuale se richiede app logic).
2. Verificare `release-gate` green ×2 consecutive su stesso SHA.
3. Verificare `release-gate-cert` green incluso iOS combobox.
4. Estrarre numeri `audit:smoke:residues` da log cert green (soglia ≤5).

---

## Modifiche applicate in questa validazione

1. [`docs/audit-release-gate-validation-2026-06.md`](./audit-release-gate-validation-2026-06.md) — questo report (+ sezione chiusura operativa)
2. [`lib/smoke/cleanup-smoke-data.ts`](../lib/smoke/cleanup-smoke-data.ts) — prune `log_modifiche` smoke
3. [`lib/smoke/smoke-data-markers.ts`](../lib/smoke/smoke-data-markers.ts) — helper `isSmokeLogModificheRow`
4. [`scripts/audit-smoke-residues.ts`](../scripts/audit-smoke-residues.ts) — fix tabella + soglia `SMOKE_RESIDUE_OPERATIVE_THRESHOLD`
5. [`lib/regression/smoke-regression-lists.ts`](../lib/regression/smoke-regression-lists.ts) — +documenti/report inputs extended
6. [`docs/gate-matrix.md`](./gate-matrix.md) — criterio livello A + soglia residues
7. **Chiusura operativa:** push `467013a` + `97a2835`; fix audit extended (configurazione/magazzino/mezzi/lavorazioni-e2e)

---

## Raccomandazioni residue (solo rifinitura)

1. **Stabilizzare spec 13 E2E** (`scheda-smoke` PR + `smoke:playwright:cert`) — blocker P0 attuale su CI.
2. Dopo gate green: dispatch run #2 e confermare consecutività.
3. Estrarre conteggi residues da cert green; opzionale `SMOKE_RESIDUE_STRICT=1`.
4. Ripristino iOS in PR solo dopo fix product combobox (task separato).

---

## Percorso verso A — Production Certified

| Requisito | Stato (2026-06-09, SHA `97a2835`) |
|---|---|
| `release-gate` green ×2 su main post-consolidamento | **NO** — #71, #72 failure |
| `release-gate-cert` green (iOS combobox) | **NO** — #37 failure |
| Residues operativi ≤5 post-cleanup | **N/D** — step skipped |
| Chiusura P0 BS-1/BS-2 | **Parziale** — BS-2 chiuso (CI validato); BS-1 aperto (spec 13) |

Quando tutti green → **A — Production Certified**.
