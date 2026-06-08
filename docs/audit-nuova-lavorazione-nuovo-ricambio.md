# Audit — Nuova Lavorazione + Nuovo Ricambio

**Data:** 2026-06-08  
**Scope:** modal create SSOT — `[lavorazione-create-modal.tsx](../components/gestionale/lavorazioni/lavorazione-create-modal.tsx)`, `[ricambio-new-modal.tsx](../components/gestionale/magazzino/ricambio-new-modal.tsx)`  
**Baseline:** audit Scheda di Ingresso (`[audit-scheda-ingresso.md](./audit-scheda-ingresso.md)`), audit modali cross-cutting (`[audit-modals-cross-cutting.md](./audit-modals-cross-cutting.md)`)  
**Logica di business:** non modificata (salvo fix tecnici save/focus).

---

## Riepilogo esecutivo


| Modal                 | Entry                    | Form body                                                 | Shell                                                | Score    |
| --------------------- | ------------------------ | --------------------------------------------------------- | ---------------------------------------------------- | -------- |
| **Nuova Lavorazione** | `LavorazioneCreateModal` | `SchedaIngressoFormBody` (`variant="create-lavorazione"`) | `SchedaIngressoFormModalShell`                       | **9/10** |
| **Nuovo Ricambio**    | `RicambioNewModal`       | `RicambioFormFields`                                      | `GestionaleModalShell` + `GestionaleModalScrollBody` | **8/10** |


**Correzioni applicate in questo audit**

1. **Ricambio — `draftRef`:** allineamento al pattern `fieldsRef` di Nuova Lavorazione; submit legge `draftRef.current` dopo `flushSync` del focus scope.
2. **Ricambio — doppio focus scope:** rimosso `GestionaleFormFocusScope` interno in `RicambioFormFields` (il `<form>` padre espone già `gestionaleFormFocusScopeProps`); evita doppio handler Enter in bubble.

**Debito architetturale (non toccato):** `NewLavorazioneModal` in `[lavorazioni-modals.tsx](../components/gestionale/lavorazioni/lavorazioni-modals.tsx)` — legacy, non usato da `lavorazioni-view.tsx`.

---

## 1. Nuova Lavorazione — mappa campi

Modello: `SchedaIngressoFields` (19 campi) + meta create (`stato`, `priorita`, `mezzoId`, `createdBy`).

Dettaglio campi: vedi `[audit-scheda-ingresso.md](./audit-scheda-ingresso.md)` §1 (stesso form).

### Meta create (solo `LavorazioneCreateModal`)


| Campo       | UI                          | Obbl. submit                  | Persistenza              |
| ----------- | --------------------------- | ----------------------------- | ------------------------ |
| `stato`     | `GlobalFixedListPillSelect` | Sì (config globale)           | `lavorazioni.stato`      |
| `priorita`  | Pill                        | Sì (lista config)             | `lavorazioni.priorita`   |
| `mezzoId`   | Hint + upsert               | No (derivato da ident/upsert) | `lavorazioni.mezzo_id`   |
| `createdBy` | —                           | Sì (auth)                     | `lavorazioni.created_by` |


### Catena submit

```
fieldsRef → upsertMezzoFromSchedaIngresso → useLavorazioneCreateMutation
  → persistSchedeStore (ingresso.campi = currentFields)
  → dispatchGestionaleLocalMutation (scheda_lavorazione / lavorazioni)
```

- `**noteIntervento`:** `trim()` → `lavorazioni.note` **e** `ingresso.campi.noteIntervento` (stessa fonte al create — nessuna divergenza).
- **Retry parziale:** `createdLavorazioneIdRef` se INSERT ok ma `persistSchedeStore` fallisce.
- **Reset:** `useEffect` su `open` → `emptySchedaIngressoFields`, reset stato/priorità/errori.
- **Autofill:** `useSchedaIngressoMezzoPrompt` + ident targa/matricola (debounce 300 ms nel hook) + `defaultMezzoId`.

### Validazioni submit


| Controllo                       | Comportamento                    |
| ------------------------------- | -------------------------------- |
| `createdBy`                     | Toast validation                 |
| `cliente` + `marcaAttrezzatura` | Toast validation                 |
| `stato` in config               | Toast validation                 |
| `priorita` in lista             | Toast validation                 |
| `assertItalianDay`              | **No** in create (solo hub edit) |


### Infrastruttura mobile/save

- `gestionaleFormFocusScopeProps` su `<form>` (flush combobox + `flushSync`).
- `fieldsRef` + `useLayoutEffect` sync.
- `gestionaleMultilineEnterProps` su textarea Intervento.
- `GestionaleModalScrollBody` via `SchedaIngressoFormBody`.
- `useGlobalOptions({ enabled: open })`, `useMezziListQuery`, `resolveFreshCatalog` al submit.

---

## 2. Nuovo Ricambio — mappa campi

Modello: `RicambioFormState` in `[lib/magazzino/form.ts](../lib/magazzino/form.ts)`.

### Identificazione


| Campo                                | UI                         | HTML required (create)     | Submit lenient        |
| ------------------------------------ | -------------------------- | -------------------------- | --------------------- |
| `marca`                              | `GlobalSettingsListSelect` | No (`relaxHtmlValidation`) | `"—"` se vuoto        |
| `codiceFornitoreOriginale`           | input + scan duplicati     | No                         | `"—"` normalizzato    |
| `codiceFornitoreOriginaleSecondario` | opzionale                  | No                         | normalizzato          |
| `marcaOriginaleSecondaria`           | opzionale                  | No                         | trim                  |
| `descrizione`                        | input                      | No                         | `"Senza descrizione"` |
| `note`                               | textarea + multiline Enter | No                         | trim                  |
| `categoria`                          | list select                | No                         | `"—"`                 |
| `usatoInTagliandi`                   | segmented No/Sì            | —                          | boolean               |


### Compatibilità


| Campo                            | UI                          | Submit                                                            |
| -------------------------------- | --------------------------- | ----------------------------------------------------------------- |
| `compatibilitaMezzi`             | `RicambioFormCompatSection` | `expandRicambioCompatibilitaMezzi` + `writeCompatibilitaRicambio` |
| `compatMarcheAttrezzaturaFiltro` | filtri marca                | espansione al save                                                |
| `compatMarcheTelaioFiltro`       | filtri telaio               | espansione al save                                                |


### Giacenza e prezzi


| Campo                      | UI                                    | Default                   |
| -------------------------- | ------------------------------------- | ------------------------- |
| `scorta` / `scortaMinima`  | `StockStepper`                        | `"0"`                     |
| `prezzoFornitoreOriginale` | input                                 | `"0"`                     |
| `scontoFornitoreOriginale` | input                                 | `"0"`                     |
| `markupPercentuale`        | input                                 | `"45"`                    |
| `prezzoVendita`            | calcolato (`syncPrezzoVenditaInForm`) | derivato listino+markup   |
| `fornitoriAlternativi`     | editor righe                          | `[]` + mirror flat legacy |


### Catena submit

```
draftRef → validateRicambioListFields (solo valori fuori elenco globale)
  → ricambioFromFormLenient(draftId come id finale)
  → magazzinoService.create → patchProdotti / invalidate
```

- `**draftId`:** UUID pre-save = `id` record finale → immagini `RecordImageManager` già collegate.
- **Duplicati codice OE:** debounce 400 ms su `codiceScan` → banner + «Vai al ricambio».
- **Reset:** unmount condizionale in `magazzino-view` (`newOpen ? <RicambioNewModal /> : null`); `handleClose` purge log draft.
- **Policy lenient:** salvataggio con campi vuoti produce segnaposto — **intenzionale** (magazzino rapido in officina).

### Validazioni submit


| Controllo                                    | Blocca?                           |
| -------------------------------------------- | --------------------------------- |
| `marca` / `categoria` non in elenchi globali | Sì (`validateRicambioListFields`) |
| compat linee non ammesse                     | Sì (post-espansione)              |
| marca/codice/descrizione vuoti               | **No** (placeholder lenient)      |


---

## 3. UX / workflow industriale


| Criterio      | Nuova Lavorazione                              | Nuovo Ricambio                             |
| ------------- | ---------------------------------------------- | ------------------------------------------ |
| Click-to-save | 1 submit scheda completa                       | 1 submit; form lungo (scroll)              |
| Campi minimi  | Cliente + marca attrezzatura                   | Nessun blocco core (lenient)               |
| Ordine logico | Accettazione officina (data → cliente → mezzo) | Identificazione → compat → scorte → prezzi |
| Attrito       | Autofill mezzo / ultima scheda                 | Avviso duplicato codice + deep link        |
| Terminologia  | Allineata Scheda Ingresso / PDF                | OE, listino, markup magazzino              |


**Raccomandazioni UX (non implementate)**

- **Media:** in Ricambio, opzionale banner «campi importanti mancanti» usando `ricambioFormImportantWarnings` (solo informativo).
- **Bassa:** allineare copy obbligatorietà tra create lavorazione (strict) e create ricambio (lenient) in documentazione operatore, non nel codice.

---

## 4. Data integrity

### Nuova Lavorazione

- Unit: `[scheda-ingresso-roundtrip.test.ts](../lib/schede/scheda-ingresso-roundtrip.test.ts)`, `[scheda-ingresso-ios-save-audit.test.ts](../lib/regression/scheda-ingresso-ios-save-audit.test.ts)`.
- E2E: `[13-lavorazioni-scheda-ingresso.spec.ts](../e2e/smoke/13-lavorazioni-scheda-ingresso.spec.ts)` (config `playwright.mobile-cert.config.ts`).
- `noteIntervento` → `lavorazioni.note` + `ingresso.campi` — verificato, coerente al create.

### Nuovo Ricambio

- Normalizzazione codice OE, espansione compat, sync prezzo vendita — in `ricambioFromFormLenient`.
- Immagini draft: stesso UUID del record finale — nessuna migrazione post-create necessaria.
- **Rischio operativo documentato:** record con segnaposto `"—"` / `"Senza descrizione"` in magazzino — policy business, non bug.

---

## 5. Mobile / iOS


| Controllo                       | Nuova Lavorazione    | Nuovo Ricambio                           |
| ------------------------------- | -------------------- | ---------------------------------------- |
| `gestionaleFormFocusScopeProps` | Sì (`<form>`)        | Sì (`<form>`)                            |
| `gestionaleMultilineEnterProps` | Sì (textarea scheda) | Sì (note)                                |
| `GestionaleModalScrollBody`     | Sì                   | Sì                                       |
| `useMobileModalKeyboard`        | Via shell            | Via shell                                |
| `CAB_FOCUS_SCROLL_`*            | `FormSection`        | `CAB_FOCUS_SCROLL_GROUP_ATTR` su sezioni |
| Combobox flush iOS              | Centralizzato        | Centralizzato                            |


`npm run ios:check`: **PASS** (nessun blocker sui due modal). Warning preesistenti su `ricambio-modal-ui.ts` (token sezione, non shell) e design-system font size globale.

---

## 6. Performance (analisi statica)


| Modal       | Pattern                                                                                                                | Valutazione                            |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Lavorazione | `useGlobalOptions({ enabled: open })`, debounce ident 300 ms, refetch catalogo al submit                               | Adeguato                               |
| Ricambio    | `previewLineari` useMemo (5 dipendenze), debounce duplicati 400 ms, `RicambioFormCompatSection` potenzialmente pesante | Adeguato; nessun lag osservato in test |


Nessun debounce su input testo libero — corretto per UX industriale.

---

## 7. Coerenza architetturale (vs audit modali)


| Pattern                   | Nuova Lavorazione       | Nuovo Ricambio          | Stato                      |
| ------------------------- | ----------------------- | ----------------------- | -------------------------- |
| Form submit + focus scope | OK                      | OK                      | —                          |
| Ref sync submit           | `fieldsRef`             | `draftRef` (fix audit)  | Allineato                  |
| Textarea Enter            | OK                      | OK                      | —                          |
| Validazione obbligatori   | Strict (2 campi + meta) | Lenient + HTML relaxed  | Documentato, non unificato |
| Doppio focus scope        | No                      | **Rimosso** (fix audit) | OK                         |


---

## 8. Edge case


| Scenario                 | Nuova Lavorazione                         | Nuovo Ricambio                             |
| ------------------------ | ----------------------------------------- | ------------------------------------------ |
| Submit rapido post flush | `fieldsRef`                               | `draftRef`                                 |
| Doppio submit            | `pending` mutation                        | `saveBusy`                                 |
| Valori lunghi / emoji    | `TEXT_SHORT` / `TEXT_LONG` / `TEXT_EXTRA` | note libere; codice normalizzato           |
| Retry scheda sync        | `createdLavorazioneIdRef`                 | N/A                                        |
| Codice duplicato         | N/A                                       | «Vai al ricambio» + cleanup draft su close |
| Salvataggio campi vuoti  | Bloccato (cliente/marca)                  | Consentito (placeholder)                   |


---

## 9. Regression check


| Comando                         | Esito                                                           |
| ------------------------------- | --------------------------------------------------------------- |
| `npm run ci:tsc`                | PASS                                                            |
| `npm run smoke:regression`      | PASS (incluso `nuova-lavorazione-nuovo-ricambio-audit.test.ts`) |
| `npm run ios:check`             | PASS                                                            |
| `npm run smoke:playwright:cert` | Non eseguito (richiede credenziali smoke / WebKit locale)       |


---

## 10. Valutazione qualità (0–10)

### Nuova Lavorazione — **9/10**


| Criterio             | Voto | Note                                               |
| -------------------- | ---- | -------------------------------------------------- |
| Affidabilità save    | 9    | `fieldsRef`, retry scheda, catena mezzo→lav→scheda |
| Mobile/iOS           | 9    | Pattern SSOT post-audit Scheda Ingresso            |
| Coerenza DS          | 9    | FormSection, pill, stesso form hub                 |
| Workflow industriale | 9    | Autofill, copia ultima scheda, salva mezzo         |


**−1:** form molto esteso per accettazione rapida; accettabile per dominio.

### Nuovo Ricambio — **8/10**


| Criterio             | Voto | Note                                                 |
| -------------------- | ---- | ---------------------------------------------------- |
| Affidabilità save    | 8    | `draftRef` aggiunto; lenient by design               |
| Mobile/iOS           | 8    | Scroll body + focus scope; form lungo                |
| Coerenza DS          | 8    | Sezioni ricambio, allineato edit modal               |
| Workflow industriale | 8    | Duplicati utili; lenient può generare record sporchi |


**−2:** policy lenient vs strict lavorazione; lunghezza form.

---

## 11. Raccomandazioni

### Priorità alta

- Nessuna modifica codice richiesta oltre ai fix già applicati.

### Priorità media

- Eseguire `smoke:playwright:cert` in CI locale prima di release con credenziali smoke.
- Valutare banner non bloccante `ricambioFormImportantWarnings` in create (solo UX).

### Priorità bassa

- Rimuovere o deprecare formalmente `NewLavorazioneModal` legacy.
- Documentare per operatori la differenza strict/lenient tra lavorazione e ricambio.

---

## 12. Rischi residui

1. **Ricambio lenient:** record incompleti in magazzino — rischio operativo, non tecnico.
2. **Lavorazione retry scheda:** utente deve riprovare submit se `schedaSyncError` (messaggio esplicito).
3. **iOS font <16px:** warning globale design-system — fuori scope modal specifici.
4. **Playwright cert:** spec 13 non nel gate chromium principale — copertura E2E create lavorazione solo su config cert.

---

## Riferimenti test

- `[lib/regression/nuova-lavorazione-nuovo-ricambio-audit.test.ts](../lib/regression/nuova-lavorazione-nuovo-ricambio-audit.test.ts)` — assert statici SSOT.
- `[lib/regression/modal-cross-audit.test.ts](../lib/regression/modal-cross-audit.test.ts)` — audit trasversale textarea/focus.

