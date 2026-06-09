# Audit stabilizzazione spec 13 E2E — Giugno 2026

**Data:** 2026-06-09  
**SHA fix:** `fb7d427`  
**Scope:** spec 13 Playwright (`scheda-smoke` + `smoke:playwright:cert`) — zero nuovi test, zero release gate changes

---

## Root cause spec 13 failure

### Classificazione (gate decisionale)

| Evidenza | Diagnosi | Track |
|---|---|---|
| CI #72/#37: failure step spec 13 (~5 min desktop, ~18 min cert) | Due failure mode distinti ma correlati | E2E + submit layer |
| Storico iOS: `cliente` `undefined` in payload `scheda_lavorazione` | **Submit layer bug** — `patch({ cliente })` senza `flushSync` reale → snapshot Form Engine stale | Submit plumbing |
| Desktop full-flow: helper fragili (addetto ArrowDown, hub dialog ambiguo, no network wait) | **Test orchestration** | E2E-only |
| iOS test: `save.click()` + polling `capture.ingressoCampi` vs `requestSubmit` full-flow | **Automation parity gap** | E2E-only |

**Verdetto RCA:** combinazione **submit layer** (cliente non sincronizzato nel ref pre-snapshot) + **orchestrazione E2E** non deterministica (assert su array route, selector hub, combobox addetto).

---

## Desktop failure breakdown

| Step | Fragilità | Fix |
|---|---|---|
| `fillListCombobox` | Opzioni globali page, no dismiss dropdown | listbox scope + Escape + assert valore |
| `searchLavorazioneByToken` | No wait GET list | `waitForResponse` lavorazioni GET |
| `openIngressoEditorFromHub` | `page.getByRole("dialog")` ambiguo | `hubDialog(page)` filtrato |
| Edit ingresso save | click senza network wait | `clickSalvaSchedaIngressoEdit` |
| Identificazione macchina | `locator("..")` traversal | `fillIdentificazioneMacchina` label-scoped |
| Addetto riga | ArrowDown+Enter flaky | `fillAddettoRiga` / `fillListCombobox` |
| Salva scheda lavorazioni | button onClick, no wait | `clickSalvaSchedaHub` + `waitForSchedaPersist` |
| `submitCreateLavorazione` | solo wait lavorazioni POST | + wait scheda_lavorazione |

---

## iOS failure breakdown

| Step | Fragilità | Fix |
|---|---|---|
| `fillMinimal...` | `save.click()` vs `requestSubmit` | `requestSubmit` + network assert |
| Assert finale | `toPass(60s)` su `capture.ingressoCampi` | `waitForSchedaPersist({ expectCliente })` |
| Submit app | `patch` + `flushSync(() => {})` vuoto | `flushSync(() => patch({ cliente }))` |
| WebKit/mobile | save fuori viewport | `scrollIntoViewIfNeeded` centralizzato |

---

## Timing / race condition map

| ID | Race | Mitigazione |
|---|---|---|
| R-A | Assert prima completamento POST scheda | `waitForSchedaPersist` pre/post submit |
| R-B | Snapshot Form Engine prima patch cliente | `flushSync(() => patch(...))` in create modal |
| R-C | Dropdown portal aperto interferisce focus | Escape post combobox fill |
| R-D | Hub dialog multipli | `hubDialog()` locator SSOT |
| R-E | Route capture array vs ground truth | Response body parse come fonte primaria |

---

## Fix applicati

| File | Modifica |
|---|---|
| [`e2e/helpers/lavorazioni-scheda.ts`](../e2e/helpers/lavorazioni-scheda.ts) | +`waitForSchedaPersist`, `waitForLavorazioneCreate`, `hubDialog`, combobox hardening, hub save helpers, requestSubmit parity |
| [`e2e/smoke/13-lavorazioni-scheda-ingresso.spec.ts`](../e2e/smoke/13-lavorazioni-scheda-ingresso.spec.ts) | Usa helper deterministici; iOS test delegato a helper (no toPass capture) |
| [`components/gestionale/lavorazioni/lavorazione-create-modal.tsx`](../components/gestionale/lavorazioni/lavorazione-create-modal.tsx) | `flushSync(() => patch({ cliente: domCliente }))` — submit plumbing |
| [`e2e/playwright.mobile-cert.config.ts`](../e2e/playwright.mobile-cert.config.ts) | timeout 180s allineato a spec describe |

**Non modificato:** release gate workflows, regression lists, business logic RBAC.

---

## Before / after stability model

| Aspetto | Before | After |
|---|---|---|
| iOS assert | Poll array route 60s × retry | Single `waitForResponse` + parse payload |
| Desktop create submit | wait solo lavorazioni POST | wait lavorazioni + scheda |
| Hub save | click fire-and-forget | click + scheda persist wait |
| Cliente pre-snapshot | patch async, flushSync vuoto | flushSync wrapping patch |
| Combobox | Enter senza assert/dismiss | fill + assert + Escape |
| Cross-browser | click vs requestSubmit split | requestSubmit ovunque |

---

## Risk residual flakiness

| Rischio | Prob. post-fix | Nota |
|---|---|---|
| WebKit auth/CORS pageerror | Bassa | `console.ts` già ignora pattern Supabase |
| Global options load lento CI | Bassa | `waitForGlobalOptionsReady` 45s |
| cert 5 progetti × retry 2 | Media | retry CI ancora attivo; fix mira determinismo first-run |
| Residues audit cert | N/D | dipende da cert green |

---

## Gate impact analysis

| Step | Impatto atteso |
|---|---|
| PR `scheda-smoke` | +5–15s per network wait (accettabile vs flake 5 min fail) |
| Cert `smoke:playwright:cert` | invariato ~18 min; meno retry se green first-run |
| Regression core | PASS locale post-fix |
| Release gate YAML | **unchanged** |

---

## Validazione locale

| Check | Esito |
|---|---|
| `npm run ci:tsc` | PASS |
| `npm run smoke:regression:core` | PASS |
| `smoke:playwright:scheda-smoke` | SKIP (no SMOKE_ADMIN_* in `.env.local`) |
| `smoke:playwright:ios-smoke` | SKIP (no credenziali) |

Validazione definitiva: **CI GitHub Actions su `fb7d427`** (vedi sezione sotto).

---

## CI post-push (`3948423` — HEAD attuale)

| Workflow | Run | Esito | Step blocker | Durata step 19/11 |
|---|---|---|---|---|
| `release-gate` | [#76](https://github.com/gnamoini/cab-gestionale/actions/runs/27177369981) | **FAILURE** | scheda-smoke spec 13 desktop | ~84s |
| `release-gate-cert` | [#41](https://github.com/gnamoini/cab-gestionale/actions/runs/27177369977) | **FAILURE** | smoke:playwright:cert | ~8.5 min |

Run intermedie post-fix: [#74](https://github.com/gnamoini/cab-gestionale/actions/runs/27175978429)/[#39](https://github.com/gnamoini/cab-gestionale/actions/runs/27175978421) (`fb7d427`), [#75](https://github.com/gnamoini/cab-gestionale/actions/runs/27176615540)/[#40](https://github.com/gnamoini/cab-gestionale/actions/runs/27176615542) (`b30b746`) — tutte **FAILURE** su spec 13.

**Nota:** log step-level (assertion message esatto) richiede accesso GitHub Actions UI/API autenticata — non disponibile in ambiente agent.

---

## Verdetto finale

**B confermato** — miglioramento architetturale significativo (helper deterministici, submit layer cliente, parse payload), ma **CI spec 13 ancora rosso** su `3948423`.

### Progressi oggettivi

- Helper E2E consolidati con network wait, hub locators, requestSubmit parity
- Submit layer: `flushSync(patch)` + merge `domCliente` nello snapshot
- Failure desktop più rapido (~84s vs ~5min pre-fix) → fail earlier nel flow (probabile create/hub, non timeout globale)
- Extended regression cert resta **green**

### Prossimo passo (fuori scope immediato)

1. Estrarre assertion message da log [#76](https://github.com/gnamoini/cab-gestionale/actions/runs/27177369981) step 19
2. Repro con credenziali smoke in `.env.local`
3. Se fail su hub lavorazioni: verificare `clickSalvaSchedaHub` vs persist path scheda tipo `lavorazioni`
