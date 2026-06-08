# Audit trasversale modal gestionale

Data: 2026-06-08  
Baseline: fix Scheda di Ingresso (iOS save, mobile focus, textarea Enter).

## Elenco completo modal

### Shell condivisa
| Componente | Ruolo |
|------------|--------|
| `LavorazioniModalShell` / `GestionaleModalShell` | Dialog root, scroll lock, `useMobileModalKeyboard`, `data-cab-modal-root` |
| `GestionaleModalScrollBody` | Corpo scroll desktop / pass-through mobile |
| `Modal` (design-system) | Wrapper su `LavorazioniModalShell` |
| `Drawer` | `useMobileModalKeyboard` dedicato |

### Modal con form / edit
| Dominio | File | Save |
|---------|------|------|
| Lavorazioni | `scheda-ingresso-form-modal.tsx` | form submit |
| Lavorazioni | `lavorazione-create-modal.tsx` | form submit |
| Lavorazioni | `lavorazione-edit-modal.tsx` | form submit |
| Lavorazioni | `lavorazioni-modals.tsx` (legacy) | form submit |
| Lavorazioni | `schede-lavorazione-modal.tsx` | button (`commit*Save`) |
| Mezzi | `mezzi-new-modal.tsx`, `mezzi-edit-modal.tsx` | form submit |
| Magazzino | `ricambio-new-modal.tsx`, `ricambio-edit-modal.tsx` + `ricambio-form-fields.tsx` | form submit |
| Documenti | `documenti-modals.tsx` | form submit |
| Dashboard | `dashboard-promemoria-form-modal.tsx` | form submit |
| Sicurezza | `security-edit-name-modal.tsx`, `security-create-user-modal.tsx` | form submit |
| Preventivi | `preventivi-editor-modal.tsx` | button (`onSalva`) |
| Bunder | `bunder-editor-modal.tsx` | button (`salva`) |

### Sub-componenti con save button
| File | Note |
|------|------|
| `hub-modal-panoramica.tsx` | Note operative hub (textarea + Salva note) |

### Modal read-only / hub
`lavorazione-detail-modal.tsx`, `mezzi-hub-detail-modal.tsx`, `dipendente-detail-modal.tsx`, `magazzino-modals.tsx`

### Dialog conferma (solo inventario)
`GestionaleConfirmDialog`, dialog elimina/conferma lavorazioni/preventivi/schede, settings confirm, ecc.

---

## Modal controllati

Tutti i modal con input edit elencati sopra + infrastruttura SSOT (`gestionale-form-focus-scope`, `gestionale-form-submit-flush`, `mobile-modal-behavior`).

---

## Problemi trovati (pre-fix)

| Categoria | Descrizione | File a rischio |
|-----------|-------------|----------------|
| Combobox flush iOS | Tap Salva senza blur → payload stale | Save via button senza `onSubmitCapture` |
| React state stale | `setState` non flushato prima della lettura ref | Form con ref al submit (parziale) |
| Textarea Enter | Enter avanza focus invece di newline | Tutte le textarea modal tranne scheda ingresso |
| Focus scope mancante | Nessun flush combobox su submit | `security-create-user-modal` |
| Scroll mobile | Pattern scroll non standard | `lavorazione-detail-modal` |

---

## Problemi già corretti in Scheda di Ingresso e ritrovati altrove

| Fix originale | Ritrovato in |
|---------------|--------------|
| Flush combobox pre-submit | `schede-lavorazione-modal`, `preventivi-editor-modal`, `bunder-editor-modal`, `hub-modal-panoramica` |
| `flushSync` pre-read state | Centralizzato in `gestionaleFormFocusScopeProps` (tutti i form) + `prepareGestionaleModalSave` (button) |
| `data-gestionale-enter="ignore"` | 9 file modal + `ricambio-form-fields` + `hub-modal-panoramica` |
| `gestionaleFormFocusScopeProps` | `security-create-user-modal` |
| `GestionaleModalScrollBody` | `lavorazione-detail-modal` |

---

## Correzioni applicate

### Utility condivise
- [`lib/ui/gestionale-modal-save-prep.ts`](../lib/ui/gestionale-modal-save-prep.ts) — `prepareGestionaleModalSave`, `prepareGestionaleModalSaveFrom`, `resolveGestionaleModalRoot`
- [`lib/ui/gestionale-form-submit-flush.ts`](../lib/ui/gestionale-form-submit-flush.ts) — `flushGestionalePendingCommits` (generalizzato da form-only)
- [`components/gestionale/gestionale-form-focus-scope.tsx`](../components/gestionale/gestionale-form-focus-scope.tsx) — `gestionaleMultilineEnterProps`, `flushSync` in `onSubmitCapture`
- Export da [`components/gestionale/global-input/index.ts`](../components/gestionale/global-input/index.ts)

### Button-save
- `schede-lavorazione-modal.tsx` — `prepareGestionaleModalSave` in `commitIngressoSave`, `commitLavorazioniSave`, `commitRicambiSave`; prop `modalRootRef` su shell
- `preventivi-editor-modal.tsx` — `prepareGestionaleModalSave` in `onSalva`
- `bunder-editor-modal.tsx` — `prepareGestionaleModalSave` in `salva`
- `hub-modal-panoramica.tsx` — `prepareGestionaleModalSaveFrom` su Salva note

### Form / textarea
- `security-create-user-modal.tsx` — `gestionaleFormFocusScopeProps`
- Textarea multiriga: `scheda-ingresso-form-modal`, `documenti-modals`, `lavorazioni-modals`, `bunder-editor-modal`, `preventivi-editor-modal`, `dashboard-promemoria-form-modal`, `lavorazione-edit-modal`, `ricambio-form-fields`, `schede-lavorazione-modal` (`AutoGrowTextarea`), `hub-modal-panoramica`

### Mobile scroll
- `lavorazione-detail-modal.tsx` — sostituito scroll ad hoc con `GestionaleModalScrollBody`

### Shell
- `lavorazioni-modals.tsx` — prop opzionale `modalRootRef` per flush pre-save

---

## Componenti condivisi coinvolti

| Componente | Ruolo |
|------------|--------|
| `GlobalSelect` | Registry `registerGestionaleComboboxFlush` |
| `gestionaleFormFocusScopeProps` | Enter navigation + flush combobox + flushSync su form submit |
| `gestionaleMultilineEnterProps` | Opt-out Enter su textarea |
| `prepareGestionaleModalSave` | Flush combobox + flushSync per save via button |
| `useMobileModalKeyboard` | Padding tastiera, settle timing |
| `scheduleGestionaleFieldScroll` | Scroll focus con titolo sezione visibile |
| `GestionaleModalScrollBody` | Pattern scroll modale |

---

## Compatibilità Android

- Flush combobox e flushSync: nessun effetto negativo su Chrome Android; previene race tap-Salva / blur.
- Textarea Enter: comportamento corretto (newline) su tutti i form scope.
- Scroll/focus: `useMobileModalKeyboard` già attivo su tutte le shell gestionale.

Verifica: test statici + `ios:check` PASS; emulazione Playwright `mobile-android` (spec esistente `13-lavorazioni-scheda-ingresso.spec.ts`).

---

## Compatibilità iOS

- **Safari / Chrome iOS / iPadOS**: flush combobox prima del save risolve perdita dati su combobox senza blur.
- **flushSync** centralizzato evita payload con ultimo carattere/state mancante.
- **Textarea**: Enter non sposta più il focus (fix focus navigation).
- **Scroll**: `GestionaleModalScrollBody` allinea `lavorazione-detail-modal` al pattern mobile SSOT.

Verifica: `scheda-ingresso-ios-save-audit.test.ts`, `modal-cross-audit.test.ts`, `ios:check` PASS.

---

## Problemi di data integrity trovati

| Flusso | Rischio | Mitigazione |
|--------|---------|-------------|
| Schede hub save button + `GlobalSettingsListSelect` | Combobox non committato | `prepareGestionaleModalSave` |
| Bunder `GlobalSelect` tipo + save button | Idem | `prepareGestionaleModalSave` |
| Security create user + `GlobalSettingsListSelect` | Idem su form submit | `gestionaleFormFocusScopeProps` |
| Preventivi `draftRef` + button save | State batching | `prepareGestionaleModalSave` + `useLayoutEffect` su draft |
| Schede ingresso hub `ingressoDraftRef` | Ref sync | Già aggiornato in `onSave` / `openIngressoEditor` |

Nessun mismatch schema DB rilevato; problemi erano lato client pre-submit.

---

## Problemi di focus/scroll trovati

| Problema | Stato |
|----------|--------|
| `lavorazione-detail-modal` senza `GestionaleModalScrollBody` | Corretto |
| Titolo sezione nascosto al focus mobile | Già SSOT in `mobile-modal-behavior` (scheda ingresso) |
| Input font &lt;16px in schede hub (warning ios:check) | Pre-esistente, fuori scope (no cambio comportamento) |

---

## Problemi textarea trovati

Tutte le textarea edit nei modal elencati mancavano di `gestionaleMultilineEnterProps`. Corrette in batch; copertura verificata da `modal-cross-audit.test.ts` (9 file `*modal*.tsx` + `ricambio-form-fields` + `hub-modal-panoramica`).

---

## Verifica regressioni finale

| Check | Esito |
|-------|--------|
| `lib/regression/modal-cross-audit.test.ts` | PASS |
| `lib/regression/lavorazioni-inputs-audit.test.ts` | PASS |
| `lib/regression/scheda-ingresso-ios-save-audit.test.ts` | PASS |
| `lib/regression/scheda-ingresso-mobile-focus-audit.test.ts` | PASS |
| `lib/ui/gestionale-focus-navigation.test.ts` | PASS |
| `npm run ios:check` | PASS (warning `lavorazione-detail-modal` scroll rimosso) |

### Rischi residui

- `flushSync` globale su ogni form submit: accettabile (solo al tap Salva); monitorare performance su form molto grandi.
- Input `text-xs` in tabelle schede hub: warning iOS zoom al focus — non modificato in questo audit.
- E2E Playwright con credenziali smoke: opzionale, non rieseguito in questa sessione.

---

## Riferimenti

- [audit-scheda-ingresso-ios-save.md](./audit-scheda-ingresso-ios-save.md)
- [audit-scheda-ingresso-mobile-ux.md](./audit-scheda-ingresso-mobile-ux.md)
- [modal-system.md](./modal-system.md)
