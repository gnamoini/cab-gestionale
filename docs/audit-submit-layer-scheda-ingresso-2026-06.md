# Audit submit layer — Scheda Ingresso / Nuova Lavorazione

**Data:** 2026-06-09  
**Scope:** correzione architetturale submit layer (no E2E workaround, no business logic)  
**Riferimento:** [`form-engine-ssot.md`](./form-engine-ssot.md)

---

## 1. Mappa submit flow reale

### Catena completa (post-fix)

```
input utente (GlobalSelect searchText / native onChange)
  → stato React (useFormEngineSections: values.fields + values.meta)
  → refsMap sync (setSection aggiorna ref in setState callback)
  → tap Salva
  → onSubmitCapture: flushSync drain
  → runSubmit:
       iosSubmitGuard (IME composition)
       flushGestionalePendingCommits → commitPendingForSubmit per combobox
       flushSync (drain onChange → refsMap)
       captureFormSnapshot(refsMap) → freezeSnapshot
  → handler(snap): validate + upsertMezzo + create lavorazione + persistSchedeStore
```

### File coinvolti

| Layer | File |
|---|---|
| Combobox UI | `components/gestionale/global-input/global-select.tsx` |
| Flush registry | `lib/ui/gestionale-form-submit-flush.ts` |
| Capture phase | `components/gestionale/gestionale-form-focus-scope.tsx` |
| Pipeline FSE | `lib/forms/form-engine/prepare-form-submit.ts` |
| Snapshot | `lib/forms/form-engine/use-form-engine.ts`, `capture-form-snapshot.ts` |
| Create modal | `components/gestionale/lavorazioni/lavorazione-create-modal.tsx` |
| Form UI | `components/gestionale/schede/scheda-ingresso-anagrafica-fields.tsx` |

---

## 2. Root cause confermata

**Confermata:** race strutturale nel submit boundary, non gap E2E residuo.

Il Form Engine garantisce ref sync **se** `onChange` viene invocato prima del freeze. Il problema era:

1. **Ordine pipeline invertito** — flush combobox prima di `iosSubmitGuard` committava testo IME incompleto
2. **Capture phase anticipata** — flush combobox in `onSubmitCapture` prima di qualsiasi guard async
3. **Dual SSOT GlobalSelect** — `searchText` (UI) vs `value` (form state) richiede commit esplicito al submit; `commitBlur` usava gate `userModified` che saltava clear e alcuni commit
4. **Workaround create modal** — lettura DOM `domCliente` + patch last-second + merge override mascherava il bug senza eliminarlo

**Smentita parziale:** `setSection` / `refsMap` sync funziona correttamente quando il pipeline commit è completo.

---

## 3. Race condition trovate

| ID | Scenario | Stato post-fix |
|---|---|---|
| R1 | IME attivo al submit | **Risolto** — guard prima di flush |
| R2 | Double flush pre-guard in capture | **Risolto** — capture fa solo drain |
| R3 | commitBlur skip onChange (clear senza userModified) | **Risolto** — `commitPendingForSubmit` invariante |
| R4 | domCliente truthy-only asymmetric patch | **Risolto** — workaround rimosso |
| R5 | runSubmitFromGetter senza flush post-guard | **Risolto** — usa `prepareFormSubmitAsync` |
| R6 | Triple prepareFormSubmit ridondante | **Risolto** — un solo flush SSOT in FSE |

---

## 4. Fonti dati coinvolte

| Campo | Fonte UI | Fonte submit (pre-fix) | Fonte submit (post-fix) |
|---|---|---|---|
| cliente, cantiere, marca, … | `searchText` + `displayValue` | `value` post-commitBlur + DOM override (create) | `snap.fields` post `commitPendingForSubmit` |
| dataIngresso, richiedente, note | controlled `onChange` | `refsMap` | `refsMap` (invariato) |
| stato, priorita, mezzoId | `patchSection("meta")` | `snap.meta` | `snap.meta` (invariato) |

---

## 5. Analisi single source of truth

### Pre-fix (violazioni)

- **Triple SSOT cliente (create):** React state + DOM query + snapshot override
- **Dual SSOT combobox:** searchText vs value fino a commit
- **Boundary inconsistente:** edit modal usa solo FSE; create modal bypassa FSE con patch/DOM

### Post-fix (contratto)

- **Unica fonte submit:** `captureFormSnapshot(refsMap)` dopo pipeline `guard → flush → flushSync`
- **Combobox:** `commitPendingForSubmit` garantisce `visible === committed` prima del flush React
- **Modali pilota allineate:** create = edit = ricambio pattern (`runSubmit` only)

---

## 6. Fix progettato/applicato

| File | Modifica |
|---|---|
| `lib/forms/form-engine/prepare-form-submit.ts` | `prepareFormSubmitAsync`: iosSubmitGuard → flush → flushSync |
| `lib/forms/form-engine/run-submit.ts` | `runSubmitFromGetter` usa full `prepareFormSubmitAsync` |
| `components/gestionale/gestionale-form-focus-scope.tsx` | capture: solo flushSync drain |
| `components/gestionale/global-input/global-select.tsx` | +`commitPendingForSubmit`; registry flush usa invariante submit |
| `components/gestionale/lavorazioni/lavorazione-create-modal.tsx` | rimossi domCliente, prepareFormSubmit, flushSync; handler usa `snap.fields` |
| `lib/regression/scheda-ingresso-ios-save-audit.test.ts` | nuovo contratto + test clear invariant |
| `lib/regression/form-engine-audit.test.ts` | verifica ordine pipeline |
| `docs/form-engine-ssot.md` | sequence diagram e flusso aggiornati |

**Non modificato:** business logic, mutation, UX, layout, RBAC, Supabase, release gate, Playwright.

---

## 7. Impatto sugli altri modali

| Area | Impatto |
|---|---|
| Nuova Lavorazione | Fix primario |
| Scheda Ingresso edit | Beneficia pipeline reorder |
| Nuovo Ricambio / mezzi | Stessa pipeline FSE migliorata |
| Modali `runSubmitFromGetter` (edit lavorazione, documenti, security, promemoria) | Flush post-guard aggiunto — comportamento più corretto |
| Button-save modals | `runButtonSubmit` eredita ordine pipeline corretto |
| GlobalDatePickerYmd (`displayDraft`) | Fuori scope — non usato in Scheda Ingresso create |
| schede-lavorazione-modal (pre-FSE) | Fuori scope |

---

## 8. Rischi residui

| Rischio | Probabilità | Nota |
|---|---|---|
| `iosSubmitGuard` fail-open 100ms | Bassa | Preesistente, non peggiorato |
| `variant="filter"` free-text non committato | N/A create | By design, non in Scheda Ingresso |
| Modali pre-FSE hub schede | Media | Migrazione Fase 2 |
| CI spec 13 green al primo push | Non garantito | Validazione CI separata |

---

## 9. Valutazione finale

Il submit layer è passato da **"stato UI + ref + patch + sincronizzazioni opportunistiche"** a **"snapshot atomico deterministico"** con contratto unico:

```
iosSubmitGuard → commitPendingForSubmit → flushSync → freezeSnapshot(refsMap) → handler
```

**Payload = UI visibile** per tutti i campi Scheda Ingresso, indipendentemente da browser, focus, blur o timing E2E — senza workaround DOM o merge override.

Validazione statica: `ci:tsc`, `smoke:regression:core`. Verdetto CI operativo da confermare post-push su gate + cert.

## CI post-push (`bfe8e27`)

| Workflow | Run | Esito |
|---|---|---|
| `release-gate` | [#78](https://github.com/gnamoini/cab-gestionale/actions/runs/27178944782) | **FAILURE** |
| `release-gate-cert` | [#43](https://github.com/gnamoini/cab-gestionale/actions/runs/27178944789) | **FAILURE** |

Fix architetturale applicato; spec 13 ancora rosso — richiede estrazione assertion message da log step per diagnosi ulteriore (possibile gap E2E hub oltre submit layer).
