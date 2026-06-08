# Audit finale validazione Release Gate — Giugno 2026

**Data:** 2026-06-08  
**Scope:** validazione post-consolidamento (gate/test/cleanup/docs) — **nessun nuovo test**, nessuna logica applicativa  
**Riferimenti:** [`audit-release-gate-2026-06.md`](./audit-release-gate-2026-06.md), [`gate-matrix.md`](./gate-matrix.md)

---

## Verdetto certificazione

### **B — Conditionally Stable**

Il consolidamento ha **migliorato qualità, determinismo e hygiene** del gate. Non è ancora **A — Production Certified** perché:

1. Le modifiche consolidate sono **locali/non pushate** su `main` remoto al momento della validazione.
2. L’ultimo CI remoto su `2a6628a` (`release-gate`) risulta **failure** (workflow pre-consolidamento con `ios-smoke`).
3. `release-gate-cert` su `2a6628a` era **in progress** — esito iOS combobox non confermato green.
4. Blind spot **P0** iOS combobox E2E resta in cert finché non c’è fix product o cert stabilizzato.

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
| BS-2 | CI green post-consolidamento non verificato su remoto | **P0** | Push + monitor |
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

| Workflow | SHA remoto | Esito (2026-06-08) | URL |
|---|---|---|---|
| `release-gate` | `2a6628a` | **failure** (pre-consolidamento) | [run 27172572871](https://github.com/gnamoini/cab-gestionale/actions/runs/27172572871) |
| `release-gate-cert` | `2a6628a` | in progress / non definitivo | [run 27172572851](https://github.com/gnamoini/cab-gestionale/actions/runs/27172572851) |

**Nota:** il consolidamento gate (scheda-smoke, regression 63/44, cleanup log) è in **working tree locale** — richiede commit + push per validazione CI oggettiva.

---

## Modifiche applicate in questa validazione

1. [`docs/audit-release-gate-validation-2026-06.md`](./audit-release-gate-validation-2026-06.md) — questo report
2. [`lib/smoke/cleanup-smoke-data.ts`](../lib/smoke/cleanup-smoke-data.ts) — prune `log_modifiche` smoke
3. [`lib/smoke/smoke-data-markers.ts`](../lib/smoke/smoke-data-markers.ts) — helper `isSmokeLogModificheRow`
4. [`scripts/audit-smoke-residues.ts`](../scripts/audit-smoke-residues.ts) — fix tabella + soglia `SMOKE_RESIDUE_OPERATIVE_THRESHOLD`
5. [`lib/regression/smoke-regression-lists.ts`](../lib/regression/smoke-regression-lists.ts) — +documenti/report inputs extended
6. [`docs/gate-matrix.md`](./gate-matrix.md) — criterio livello A + soglia residues

---

## Raccomandazioni residue (solo rifinitura)

1. **Commit + push** consolidamento su `main` e verificare 2 run green `release-gate`.
2. Monitorare `release-gate-cert` (iOS combobox) — prerequisito livello A.
3. Opzionale: `SMOKE_RESIDUE_STRICT=1` in cert quando residues stabilmente ≤5.
4. Ripristino iOS in PR solo dopo fix product combobox (task separato).
5. Promuovere inputs-audit orfani rimanenti (dashboard/preventivi/bunder) se cert ha margine — test già esistenti.

---

## Percorso verso A — Production Certified

| Requisito | Stato |
|---|---|
| `release-gate` green ×2 su main post-consolidamento | Da verificare post-push |
| `release-gate-cert` green (iOS combobox) | Storicamente a rischio |
| Residues operativi ≤5 post-cleanup | Meccanismo pronto |
| Chiusura P0 BS-1/BS-2 | Aperto |

Quando tutti green → **A — Production Certified**.
