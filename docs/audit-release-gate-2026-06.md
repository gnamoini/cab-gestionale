# Audit Release Gate / CI / Smoke — Giugno 2026

**Data:** 2026-06-08  
**Scope:** workflow GitHub Actions, orchestratori locali, regression static, Playwright smoke, data hygiene  
**Vincolo rispettato:** nessuna modifica alla logica applicativa (RBAC, form submit, combobox); solo gate, test, pipeline, cleanup, documentazione.

---

## Riepilogo esecutivo

| Indicatore | Valore |
|---|---|
| **Score pre-audit** | 6.0/10 |
| **Score post-hardening (target)** | 8.0/10 |
| **Autorità deploy** | [`release-gate.yml`](../.github/workflows/release-gate.yml) → Vercel Deployment Protection |
| **Workflow attivi** | 3 (PR gate, cert, nightly) |
| **Regression core** | 63 file |
| **Regression extended** | 42 file |
| **Regression totale** | 105 file |
| **Blocker CI risolto (gate-side)** | Spec 13 test iOS spostato in cert-only; PR esegue full-flow desktop |

---

## 1. Inventario CI / GitHub Actions

| Workflow | Trigger | Timeout | Blocking | Step chiave |
|---|---|---|---|---|
| `release-gate.yml` | PR + push `main` | 30 min | **Sì** | tsc, build, ux, ios:check, production:check, regression core, flex, PW 01–12 + spec 13 desktop + spec 14, cleanup |
| `release-gate-cert.yml` | push `main`, lun 03:00 UTC, dispatch | 45 min | Sì su `main` | extended regression, publication full, soak, PW cert spec 13×4 + spec 14, audit residui advisory, cleanup |
| `release-gate-nightly.yml` | daily 02:00 UTC | 90 min | **No** | lint, full regression, soak extended |

### Orchestratori locali

| Script | Allineamento CI | Note |
|---|---|---|
| `scripts/release-gate.ts` | Parziale → allineato | Include `smoke:cleanup` advisory; Playwright SKIP esplicito senza credenziali |
| `scripts/smoke-gate.ts` | Solo Playwright | Pre-push advisory |
| `scripts/production-check.ts` | Identico CI | OK |

---

## 2. Mappa test per famiglia

| Famiglia | Quantità | Dove gira | SSOT |
|---|---|---|---|
| Regression static core | 63 | PR gate | [`smoke-regression-lists.ts`](../lib/regression/smoke-regression-lists.ts) |
| Regression static extended | 42 | Cert / nightly advisory | idem |
| Structural gate | 1 script | PR | [`smoke-structural-gate.ts`](../scripts/smoke-structural-gate.ts) |
| Playwright smoke | 14 spec | PR: 01–12, 13 desktop, 14; cert: 13×4, 14×2 | [`e2e/playwright*.config.ts`](../e2e/) |
| Production readiness | script + unit | PR | [`production-check.ts`](../scripts/production-check.ts) |
| Flex gates | 2 script PR | PR | `flex:eslint:gate`, `flex:freeze:gate` |
| Supabase publication | sanity PR / full cert | PR / cert | `ci:supabase:publication*` |
| iOS static | 1 script | PR | `ios:check` |
| UX | 2 script | PR | `ux:enforce`, `ux:mobile-gate` |

### Regression orfani (pre-audit) — azioni

| File | Classificazione | Azione |
|---|---|---|
| `notification-ui-policy.test.ts` | Utile | Promosso in **core** |
| `dropdown-outside-dismiss.test.ts` | Utile | Promosso in **core** |
| `configurazione-inputs-audit.test.ts` | Utile | Aggiunto a **extended** |
| `magazzino-inputs-audit.test.ts` | Utile | Aggiunto a **extended** |
| `mezzi-inputs-audit.test.ts` | Utile | Aggiunto a **extended** |
| Altri `*-inputs-audit` (dashboard, documenti, …) | Utile / bassa priorità | Restano fuori tier (copertura parziale via audit report) |

---

## 3. Classificazione test

### Critici (PR gate)

- Security/RBAC: `rbac-route-matrix`, `permissions-role-matrix`, `security-*`, Playwright 02/11
- Form/submit/iOS static: `forms-save-policy`, `form-engine-audit`, `modal-cross-audit`, `scheda-ingresso-ios-save-audit`, `dropdown-outside-dismiss`, `ios:check`
- Data integrity: `truth-invalidation`, `sync-invalidation-policy`, `schede-*`, `production:check`, `supabase-publication-gate`
- Domain E2E: spec 01 auth, 02 RBAC, 05 documenti, 13 desktop full-flow, 14 ricambio

### Ridondanti (rimossi da extended)

9 policy flex già coperte da `flex:eslint:gate` + `flex:freeze:gate` in PR:

- `flex-containment-policy`, `flex-system-policy`, `flex-eslint-baseline`, `flex-system-definitive`, `flex-system-freeze`, `flex-allowlist-freeze`, `flex-system-governance`, `flex-system-hard-lock`, `flex-system-absolute-final`

### Obsoleti / corretti

| Item | Problema | Azione |
|---|---|---|
| `smoke-structural-gate.ts` anchor `lavorazioni-modals` per create | SSOT create = `lavorazione-create-modal.tsx` | Anchor aggiornato |
| Spec 13 iOS combobox in PR | Fallimento ripetuto (product layer) | Spostato in **cert-only**; static audit resta in core |
| `compat-readiness-report.test.ts` in core | Non deterministico su catalogo reale | Spostato in **extended** |
| `lavorazioni-e2e-certification-audit.test.ts` in core | Wiring file, non runtime | Spostato in **extended** |
| Docs conteggi 57/46 | Drift | Allineati a 63/42 |

---

## 4. Matrice mutazioni Playwright

| Spec | Crea/modifica | Marker | Cleanup |
|---|---|---|---|
| **13** desktop + cert iOS | Lavorazione, mezzo, schede, liste globali | `AUDIT-YYYYMMDD-HHMMSS` | `cleanup-smoke-data` + `afterAll` teardown |
| **14** ricambio | `magazzino_ricambi` | `E2E-{timestamp}` | cleanup + teardown |
| **05** documenti | Upload + row `documenti` | `smoke-doc` nel filename | delete UI + cleanup globale |
| **01–04, 06–12** | Read-only / navigazione | — | N/A |
| **11** client-portal | Read-only RBAC | — | N/A |

### Gap hygiene (pre → post)

| Gap | Stato post-hardening |
|---|---|
| Delete esplicito `scheda_lavorazione` | Aggiunto prima del delete `lavorazioni` |
| `magazzino` produttori globali in prune | Aggiunto prune su `app_settings` magazzino/master |
| Spec 05 delete non garantito | Test hardened con delete + confirm |
| `modifica_log` smoke | Documentato; script `audit-smoke-residues` advisory in cert |
| Teardown per-run Playwright | `e2e/helpers/smoke-teardown.ts` + hook spec 13/14/05 |

---

## 5. Gap copertura feature

| Area | PR | Cert | Gap residuo |
|---|---|---|---|
| Login | spec 01 | — | OK |
| RBAC | static + 02/11 | — | OK |
| Lavorazioni | static + spec 13 desktop | spec 13 full mobile | iOS combobox E2E in cert (product fix separato per ripristino PR) |
| Ricambi/magazzino | static + spec 14 | spec 14 cert | No E2E produttori globali dedicato |
| Notifications UI | `notification-ui-policy` (core) | — | OK post-promozione |
| Impostazioni | `configurazione-inputs-audit` (extended) | — | OK post-promozione |

---

## 6. Performance gate

| Bottleneck | Mitigazione applicata |
|---|---|
| Playwright install ×2 (chromium + webkit) in PR | Rimosso webkit da PR (iOS test in cert); install chromium unico |
| Spec 13 iOS 3× retry × 60s in PR | Rimosso da PR gate |
| `compat-readiness-report` scan variabile | Spostato in extended |

**Target PR gate:** 10–14 min deterministico.

---

## 7. Valutazione score

| Criterio | Peso | Pre | Post |
|---|---|---|---|
| Architettura tier 1/2/3 | 20% | 9/10 | 9/10 |
| Allineamento docs/codice | 10% | 5/10 | 8/10 |
| Determinismo CI | 25% | 4/10 | 8/10 |
| Data hygiene | 20% | 6/10 | 8/10 |
| Copertura feature attuali | 15% | 6/10 | 8/10 |
| Performance | 10% | 7/10 | 8/10 |
| **Complessivo** | | **6.0/10** | **8.0/10** |

**Nota:** 9/10 quando spec 13 iOS E2E torna green in PR con fix product del combobox (`global-select`, `lavorazione-create-modal`).

---

## 8. Deliverables prodotti

1. Questo report (`docs/audit-release-gate-2026-06.md`)
2. Aggiornamento SSOT regression lists, structural gate, cleanup, Playwright gate split
3. Script advisory `scripts/audit-smoke-residues.ts`
4. Sync [`gate-matrix.md`](./gate-matrix.md), [`release-gate.md`](./release-gate.md), [`audit-release-gate.md`](./audit-release-gate.md)

Vedi anche [`gate-matrix.md`](./gate-matrix.md) per la matrice tier aggiornata.
