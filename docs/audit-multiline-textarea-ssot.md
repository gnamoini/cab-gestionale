# Audit SSOT campi multilinea gestionale

Data: 2026-06-09  
Scope: tutti i `<textarea>` in `components/`  
SSOT: [`components/gestionale/gestionale-textarea.tsx`](../components/gestionale/gestionale-textarea.tsx)

---

## Inventario textarea (pre-migrazione)

18 istanze raw in 11 file. Nessun editor rich-text né `contentEditable` multilinea.

| File | Campi | Uso |
|------|-------|-----|
| `scheda-ingresso-form-modal.tsx` | Descrizione anomalia, Note intervento | Form Engine, modale ingresso |
| `lavorazioni-modals.tsx` | Note interne (modifica / nuova) | Modali lavorazione |
| `lavorazione-edit-modal.tsx` | Note | Modifica rapida |
| `hub-modal-panoramica.tsx` | Note operative | Panoramica hub + save inline |
| `documenti-modals.tsx` | Note upload / modifica | Modali documenti |
| `preventivi-editor-modal.tsx` | Lavorazioni cliente, Note finali | Editor preventivo |
| `dashboard-promemoria-form-modal.tsx` | Descrizione | Promemoria |
| `ricambio-form-fields.tsx` | Note ricambio | Form Engine magazzino |
| `bunder-editor-modal.tsx` | Intro, descr. tecnica, clausole, note firma | Editor Bunder |
| `schede-lavorazione-modal.tsx` | Lavorazioni effettuate (per riga) | AutoGrow locale |

**Fuori scope:** Security, Report, Configurazione — nessun textarea presente.

---

## Differenze trovate (pre-SSOT)

| Area | Problema |
|------|----------|
| UI | 8+ `min-h` diversi; documenti usava `inputClass` zinc invece di `dsInput` |
| Resize | 16/18 con `resize-y` → maniglia browser visibile |
| Enter | Già uniforme via `gestionaleMultilineEnterProps` (100%) |
| Token | `dsTextarea` definito ma mai adottato |
| Performance | `AutoGrowTextarea` duplicato solo in schede |

---

## Componente SSOT

### `GestionaleTextarea`

- Token: `dsTextarea` = `dsInput` + `gestionale-textarea` + `resize-none` + `overflow-y-auto`
- CSS globale: `.gestionale-textarea { resize: none }` + `::-webkit-resizer { display: none }`
- Props: `size` (`sm` \| `md` \| `lg`), `autoGrow` (default **true**), `maxHeight`, `forwardRef`, `onChange(value: string)`
- Enter: sempre `gestionaleMultilineEnterProps` (`data-gestionale-enter="ignore"`)
- Export: `@/components/design-system`, `@/components/gestionale/global-input`

### Auto-grow (default ON)

- **Default:** `autoGrow={true}` su tutti i campi multilinea
- **Tetto:** `gestionaleTextareaMaxHeightDefault` = `min(35dvh, 16rem)` — oltre il limite, scroll interno (sicuro mobile/iOS)
- **Compatto (tabelle):** `gestionaleTextareaMaxHeightCompact` = `min(28dvh, 8rem)` — Bunder descr. tecnica, schede lavorazioni per riga
- **Misura:** `height: auto` → `scrollHeight`, cap su `maxHeight` computato; aggiornamento solo se px cambia; listener `resize` passivo
- **CSS:** `data-cab-auto-grow="true"` + `field-sizing: content` dove supportato (`@supports` in `globals.css`)
- **Opt-out:** `autoGrow={false}` per campi rigidi (non usato oggi)

### Size semantiche

| Size | min-height |
|------|------------|
| sm | 3.5rem |
| md | 5.5rem |
| lg | 7rem |

Override locali via `className` dove serviva parità visiva (es. `min-h-[4.5rem]`).

---

## Componenti migrati

Tutti i 11 file → `GestionaleTextarea`. Unica `<textarea>` nel repo: dentro il componente SSOT.

- `autoGrow`: default su tutti; `maxHeight` compact su celle tabella (schede, Bunder)
- Documenti: da `inputClass` a token design system condiviso

---

## Ottimizzazioni applicate

- `memo` + `forwardRef` sul componente SSOT
- Auto-grow centralizzato e **attivo di default** con tetto viewport (rimosso `AutoGrowTextarea` locale)
- Nessun debounce su `onChange` (salvataggio Form Engine invariato)
- Controlled pattern invariato ovunque

---

## Verifiche

### Desktop

- Enter → nuova riga (non avanza focus)
- Tab / Shift+Tab → ordine focus scope invariato
- Resize manuale grip browser disabilitato; scroll interno + auto-grow dove previsto

### Android / iOS

- `dsIosInputTextSize` (16px mobile) via `dsInput`
- `globals.css` `font-size: max(16px, 1em)` su textarea
- `gestionaleFormFocusScopeProps` + iOS submit guard invariati
- Modali: `GestionaleModalScrollBody` + `--cab-keyboard-inset`

### Form Engine

- Scheda ingresso, ricambio: `useFormEngine` + `runSubmit` invariati
- `prepareFormSubmitAsync` / `flushGestionalePendingCommits` non modificati
- Snapshot submit: nessun cambio semantica campi

---

## Test eseguiti

| Test | Esito |
|------|-------|
| `lib/regression/gestionale-textarea-ssot-audit.test.ts` | OK |
| `lib/regression/modal-cross-audit.test.ts` | OK |
| `lib/regression/lavorazioni-inputs-audit.test.ts` | OK |
| `lib/regression/nuova-lavorazione-nuovo-ricambio-audit.test.ts` | OK |
| `lib/regression/forms-save-policy.test.ts` | OK |

Aggiunto a `lib/regression/smoke-regression-lists.ts` (tier core).

---

## Problemi corretti

1. Inconsistenza visiva tra moduli (classi locali, min-height ad hoc)
2. Maniglia resize browser su dark theme
3. `dsTextarea` morto nel design system
4. Duplicazione logica auto-grow in schede
5. Documenti con styling isolato (`inputClass`)

---

## Rischi residui

| Rischio | Mitigazione |
|---------|-------------|
| Utenti abituati al drag resize nativo | auto-grow default; scroll interno oltre `min(35dvh, 16rem)` |
| iOS micro-jank al expand | misura `height: auto`; update solo se px cambia |
| Leggero shift visivo documenti (dsInput vs inputClass) | Verificare dark/light in QA |
| Campi senza `maxLength` legacy | Non introdotti limiti nuovi (perimetro invariato) |

---

## Valutazione finale

| Aspetto | Prima | Dopo |
|---------|-------|------|
| Enter multiline | 10/10 | 10/10 |
| Stile visivo | 5/10 | 9/10 |
| Resize UX | 4/10 | 8/10 |
| Test enforcement | 7/10 | 10/10 |
| **Complessivo** | **~6/10** | **~9/10** |

---

## Regression checklist manuale (consigliata)

- [ ] Scheda Ingresso — descrizione anomalia si espande fino a ~35dvh; oltre scroll interno; salvataggio iOS
- [ ] Nuova / Modifica Lavorazione — note interne auto-grow
- [ ] Nuovo / Modifica Ricambio — note auto-grow
- [ ] Schede lavorazione — auto-grow righe tabella (tetto compact)
- [ ] Preventivi — note finali + lavorazioni cliente
- [ ] Documenti — note upload/modifica
- [ ] Promemoria — descrizione
- [ ] Bunder — intro, clausole, tabella descr. tecnica
