# Verifica post-fix spec 13 — layer E2E Playwright

**Data:** 2026-06-09  
**SHA locale:** `b938e59` (include fix Escape + hardening FASE 3)  
**Riferimento forense pre-fix:** [`docs/audit-spec-13-ci-forensic-bfe8e27.md`](audit-spec-13-ci-forensic-bfe8e27.md)

**Perimetro:** solo E2E Playwright. Nessuna modifica app / Form Engine / business.

---

## 1. Fix E2E applicati

### Batch iniziale (root cause Escape)

| # | Modifica | File |
|---|---|---|
| 1 | `dismissComboboxDropdown`: no Escape; blur + click titolo + `toBeHidden` | `e2e/helpers/lavorazioni-scheda.ts` |
| 2 | `fillListCombobox`: `expect(scope).toBeVisible()` dopo ogni path | idem |
| 3 | `fillSchedaIngressoCreateForm`: `waitForGlobalOptionsReady` all'inizio | idem |
| 4 | `fillMinimalCreateAndSaveWithoutClienteBlur`: Cliente prima di Marca | idem |
| 5 | `fillAddettoRiga`: dismiss senza Escape | idem |

### Hardening FASE 3 (verifica post-fix)

| # | Modifica | File |
|---|---|---|
| 6 | `listboxForCombobox` via `aria-controls` (dismiss + option select) | `e2e/helpers/lavorazioni-scheda.ts` |
| 7 | `clickNuovaLavorazioneCta`: wait modal visibile post dynamic import | idem |
| 8 | `fillAddettoRiga`: guard `expect(hub).toBeVisible()` post-dismiss | idem |
| 9 | `matricola` / `targa`: `scrollIntoViewIfNeeded` nel full-flow | idem |
| 10 | Audit statico: vietato `keyboard.press('Escape')` in helper | `lib/regression/lavorazioni-e2e-certification-audit.test.ts` |

---

## 2. Audit statico implementazione (FASE 1)

| Componente | Esito |
|---|---|
| Escape in `e2e/` | **0 match** — confermato da audit regression |
| `dismissComboboxDropdown` non chiude modal | **OK** — solo blur + click `h2` interno dialog |
| Guard visibility post-fill | **OK** — tutti i return path di `fillListCombobox` con scope |
| `waitForGlobalOptionsReady` pre-fill gate | **OK** — L184 `fillSchedaIngressoCreateForm` |
| Cert minimal ordine DOM | **OK** — Cliente L240–244, Marca L246 |
| Listbox scoped | **OK** — `listboxForCombobox` + `optionInComboboxListbox` |

---

## 3. Esecuzione runtime locale

| Comando | Esito | Dettaglio |
|---|---|---|
| `npx tsx lib/regression/lavorazioni-e2e-certification-audit.test.ts` | **PASS** | Include assert no Escape + aria-controls |
| `npm run smoke:playwright:scheda-smoke` | **SKIP** | `SMOKE_ADMIN_EMAIL` / `SMOKE_ADMIN_PASSWORD` assenti in `.env.local` |
| `npm run smoke:playwright:cert` | **PARZIALE** | 3 progetti SKIP (no creds); 2 FAIL infra WebKit non installato (`mobile-ios`, `tablet-ios`) |

**Run ID CI post-fix:** non disponibile — validazione end-to-end richiede push su branch con secrets GitHub Actions.

### Interpretazione fail cert locale

I 2 fail **non** sono regressioni spec 13:

```
browserType.launch: Executable doesn't exist at ...\webkit-2158\Playwright.exe
```

Blocker infra locale (`npx playwright install webkit`), non orchestration combobox.

---

## 4. RCA aggiornata

| Layer | Ruolo fail `bfe8e27` | Post-fix |
|---|---|---|
| Submit layer | Escluso (pre-submit, zero POST) | Invariato |
| Orchestration E2E | **Primario** — Escape dismiss → modal chiuso | **Mitigato** |
| Selector layer | Non causa (aria-label corretti) | Rafforzato (`aria-controls`) |
| Modal lifecycle | **Primario** — gap campo N → N+1 | **Mitigato** (guard + wait CTA) |

---

## 5. Rischi residui

| Rischio | Livello |
|---|---|
| Nessuna evidenza CI verde post-fix | **Alta** (meta) |
| WebKit cert in CI (non locale) | **Media** — noto flaky infra |
| Listbox pill Stato/Priorità aperto in parallelo | **Bassa** — mitigato da `aria-controls` |
| Hub payload assert post-submit | **Bassa** — fuori fail #78/#43 |

---

## 6. Probabilità passaggio CI (stima post-hardening)

| Pipeline | Probabilità |
|---|---|
| `smoke:playwright:scheda-smoke` | **~90–94%** |
| `smoke:playwright:cert` (tutti i progetti) | **~85–90%** |
| `smoke:playwright:cert` (escluso WebKit puro) | **~92–95%** |

---

## 7. Certificazione

### **B — Conditionally Stable**

**Motivazione:**

- Root cause Escape **neutralizzata** e verificata staticamente.
- Hardening FASE 3 applicato (listbox scoped, wait dynamic import, audit anti-regressione).
- **Non promosso ad A** finché un run CI gate+cert con `SMOKE_ADMIN_*` non risulta verde senza timeout locator pre-submit.

**Condizione promozione A:**

1. Run verde `smoke:playwright:scheda-smoke` su GitHub Actions
2. Run verde `smoke:playwright:cert` (o documentata esclusione WebKit se policy cert lo consente)
3. Nessun fail su `combobox` 0 elementi / `scrollIntoViewIfNeeded` in fase fill

---

## 8. Blocker residuo se CI ancora rosso

1. Pre-submit locator → trace CI + eventuale ulteriore wait su `aria-busy` combobox (solo E2E)
2. Post-submit payload `cliente` → submit layer (fuori perimetro fix attuale)
3. Solo WebKit → infra cert, non app
