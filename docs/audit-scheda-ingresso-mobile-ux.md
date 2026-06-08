# Audit UX mobile — Scheda di Ingresso e infrastruttura modali

**Data:** 2026-06-08  
**Scope:** Focus tastiera iOS/Android su `LavorazioniModalShell` e form condivisi (Scheda di Ingresso, create lavorazione, mezzi, ricambi, …).

---

## Problemi trovati

### iOS (Safari iPhone/iPad, Chrome iOS)

| ID | Severità | Problema | Stato |
|----|----------|----------|-------|
| M1 | Alta | Focus scroll non includeva il titolo sezione (`h3` FormSection) — solo label+campo | **Risolto** |
| M2 | Media | `extraTop: 8px` insufficiente per contesto sotto browser chrome | **Risolto** (`16px` mobile) |
| M3 | Media | Race: scroll su `focusin` prima che la tastiera sia completamente aperta | **Risolto** (secondo pass a 220ms) |
| M4 | Bassa | Titolo modale ("Scheda di ingresso") può scrollare fuori viewport su mobile | Aperto (non richiesto esplicitamente; titolo sezione prioritario) |

### Android

| ID | Severità | Problema | Stato |
|----|----------|----------|-------|
| M1–M3 | — | Stessi root cause SSOT | **Risolto** (stesso layer) |
| M5 | Info | Chiusura tastiera hardware: già gestita (`preserveModalScrollTop`) | Invariato |

---

## Campi interessati

Tutti i campi in modali su `LavorazioniModalShell`, inclusi:

**Scheda di Ingresso** (`scheda-ingresso-form-modal.tsx` + `scheda-ingresso-anagrafica-fields.tsx`):

- Sezioni: Ingresso, Anagrafica cliente, Attrezzatura, Telaio, Dettagli tecnici, Intervento
- Controlli: date picker, pill select, list select, hierarchy, ident autocomplete, input, textarea

**Altri modali campione (stessa infrastruttura):**

- `LavorazioneCreateModal`
- `ricambio-form-fields.tsx`
- `mezzi-form-fields.tsx`

---

## Cause identificate

| ID | Causa | File |
|----|-------|------|
| C1 | `getFocusScrollRect` ignorava `findFocusScrollGroup` / `findGroupTitleElement` | `lib/ui/mobile-modal-behavior.ts` |
| C2 | Margine `extraTop` hardcoded a 8px | `use-mobile-modal-keyboard.ts`, combobox |
| C3 | Un solo scroll su focus/viewport resize, tastiera iOS ancora in animazione | `use-mobile-modal-keyboard.ts` |
| C4 | Header modale nello stesso scroll container mobile (non sticky) | `lavorazioni-modals.tsx` |
| C5 | Marker label su ident autocomplete via `<label>` nativo (OK) | — |

---

## Correzioni applicate

### 1. Rettangolo scroll contestuale con titolo sezione

**File:** [`lib/ui/mobile-modal-behavior.ts`](../lib/ui/mobile-modal-behavior.ts)

- `getFocusScrollRect` ora include il top del titolo sezione (`h3` in `FormSection` con `data-cab-focus-scroll-group`)
- Costanti: `MOBILE_FOCUS_EXTRA_TOP = 16`, `DESKTOP_FOCUS_EXTRA_TOP = 8`
- Helper: `resolveFocusExtraTop()`, `resolveFocusExtraBottom()`
- Default in `scrollFieldIntoModalView` e `scheduleGestionaleFieldScroll`

### 2. Timing post-tastiera iOS

**File:** [`lib/ui/use-mobile-modal-keyboard.ts`](../lib/ui/use-mobile-modal-keyboard.ts)

- Rilevamento `keyboardOpening` (`inset` in aumento)
- Secondo scroll a `KEYBOARD_SETTLE_MS` (220ms) dopo apertura tastiera
- Uso di `resolveFocusExtraTop()` / `resolveFocusExtraBottom()`
- Chiusura tastiera: nessun re-scroll aggressivo (invariato)

### 3. Combobox allineati

**File:** `global-select.tsx`, `global-fixed-list-pill.tsx` — rimosso `extraTop: 8` hardcoded; usano default SSOT.

### 4. Textarea Enter (audit precedente)

**File:** `scheda-ingresso-form-modal.tsx` — `data-gestionale-enter="ignore"` su Descrizione anomalia e Note.

---

## Verifica label visibility

| Controllo | Esito |
|-----------|-------|
| `FormField` con `htmlFor` → `data-cab-field-label` su `<label>` | OK |
| `FormField` wrapper → label con marker | OK |
| `findFieldLabelBlock` in `getFocusScrollRect` | OK |
| Combobox con caption `font-medium` | OK (`findGestionaleFieldContainer`) |

---

## Verifica section visibility

| Controllo | Esito |
|-----------|-------|
| `FormSection` → `data-cab-focus-scroll-group` + `h3` | OK |
| Titolo sezione in `getFocusScrollRect` | OK (post-fix) |
| `minFocusScrollTop` con anchor multipli | OK (unit test) |

---

## Verifica textarea

| Controllo | Esito |
|-----------|-------|
| Enter inserisce newline (non avanza campo) | OK (`data-gestionale-enter="ignore"`) |
| Multiriga preservata in salvataggio | OK (audit funzionale precedente) |
| Font 16px mobile (`dsIosInputTextSize` in `dsInput`) | OK |

---

## Verifica safe area

| Controllo | Esito |
|-----------|-------|
| `env(safe-area-inset-*)` su layer modale | OK (`design-system.ts`) |
| `--cab-vv-height`, `--cab-keyboard-inset` CSS vars | OK (`syncKeyboardCssVars`) |
| `visualViewport.offsetTop` in `visibleTop` | OK (`getVisualViewportBand`) |
| Padding bottom scroll su tastiera | OK (`applyKeyboardPadToScrollContainer`) |

---

## Verifica modal

| Controllo | Esito |
|-----------|-------|
| Mobile: scroll su host `data-cab-modal-scroll` | OK (`lavorazioni-modals.tsx`) |
| `GestionaleModalScrollBody` senza scroll attr su mobile | OK (scroll delegato al shell) |
| `useMobileModalKeyboard` su shell | OK |
| `IosInteractionStability` focusin globale | OK |

---

## Checklist manuale (da eseguire su device)

| Scenario | iPhone Safari | iPad Safari | Chrome iOS | Android Chrome |
|----------|---------------|-------------|------------|----------------|
| Campo in cima sezione Ingresso — h3+label visibili | Da verificare | Da verificare | Da verificare | Da verificare |
| Textarea Intervento — h3+label+Enter newline | Da verificare | Da verificare | Da verificare | Da verificare |
| Cambio campo con Enter (input singola riga) | Da verificare | Da verificare | Da verificare | Da verificare |
| GlobalDatePicker / pill addetto | Da verificare | Da verificare | Da verificare | Da verificare |
| Landscape | Da verificare | Da verificare | Da verificare | Da verificare |
| Desktop ≥768px — nessuna regressione scroll | Da verificare | — | — | — |

**Verifica statica/automatizzata eseguita:** test unit + regression audit (vedi sotto).

---

## Verifica regressioni

| Area | Esito atteso |
|------|--------------|
| Desktop scroll modale | Invariato (`DESKTOP_FOCUS_EXTRA_TOP = 8`) |
| Android chiusura tastiera | `preserveModalScrollTop` invariato |
| Enter navigazione input singola riga | Invariato |
| Textarea scheda ingresso | Enter = newline |
| Salvataggio / validazioni | Non toccati |
| `CAB_IOS_NO_FOCUS_SCROLL_ATTR` opt-out | Invariato |

---

## Test automatici

```bash
npx tsx lib/ui/mobile-modal-behavior.test.ts
npx tsx lib/regression/scheda-ingresso-mobile-focus-audit.test.ts
npx tsx lib/regression/lavorazioni-inputs-audit.test.ts
```

---

## Rischi residui

1. **Titolo modale non sticky (M4):** su form molto lunghi il titolo "Scheda di ingresso" può uscire dallo scroll; il titolo **sezione** resta ancorato. Fix opzionale: `sticky` su header solo `max-md:`.
2. **Device fisici:** checklist manuale da completare su Safari/Chrome reali.
3. **Campi in fondo con tastiera + footer:** footer nel container scroll può ridurre spazio; monitorare su iPhone SE.

---

## Riferimenti

- Audit funzionale Scheda di Ingresso: [`docs/audit-scheda-ingresso.md`](audit-scheda-ingresso.md)
- SSOT scroll: [`lib/ui/mobile-modal-behavior.ts`](../lib/ui/mobile-modal-behavior.ts)
