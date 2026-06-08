# Audit — perdita dati Scheda di Ingresso su iOS

**Data:** 2026-06-08  
**Scope:** salvataggio Scheda di Ingresso su iOS (e submit rapido senza blur)  
**Layer responsabile:** input / form state (non DB, non rendering)

---

## Root cause identificata

Due race condition combinate, riproducibili anche senza dispositivo fisico:

### 1. `GlobalSelect` — commit differito su blur

Durante la digitazione in combobox (`cliente`, `cantiere`, `utilizzatore`, gerarchie marca/modello, ecc.) il testo resta in `searchText` locale. `onChange` del parent viene chiamato solo in:

- `commitBlur()` (blur con debounce 120ms)
- Enter con match
- selezione da dropdown

L’input mostra `autocompleteDisplayValue` → l’utente **vede** il testo digitato anche se `value` nel form state è ancora quello precedente.

Su **iOS Safari**, il tap su «Salva scheda» spesso **non** esegue blur prima del submit (`relatedTarget` null su touch). Il payload inviato contiene il valore vecchio.

**Dimostrato da:** [`lib/regression/scheda-ingresso-ios-save-audit.test.ts`](../lib/regression/scheda-ingresso-ios-save-audit.test.ts)

### 2. `draftRef` / `fields` stale al submit

`SchedaIngressoEditModal` leggeva `draftRef.current` aggiornato solo in `useLayoutEffect` dopo `setDraft`. Un salvataggio immediato dopo l’ultimo `onChange` poteva inviare lo stato del render precedente.

`LavorazioneCreateModal` leggeva `fields` dalla closure del render con lo stesso rischio.

**Escluso come causa primaria:**

- **DB / persist:** `commitIngressoSave` → `persistSchedeBundle` scrive `contenuto.doc.campi` integralmente; round-trip test OK ([`scheda-ingresso-roundtrip.test.ts`](../lib/schede/scheda-ingresso-roundtrip.test.ts)).
- **Rendering:** panoramica e riapertura scheda leggono `campi` dal bundle; se manca un campo, non è salvato in `campi`.
- **Validazione:** `assertItalianDay` blocca il save su data invalida ma non tronca silenziosamente altri campi.

---

## Campi coinvolti

| Rischio | Campi |
|---------|-------|
| **Alto** (combobox blur-commit) | `cliente`, `cantiere`, `utilizzatore`, `tipoAttrezzatura`, `marcaAttrezzatura`, `modelloAttrezzatura`, `tipoTelaio`, `marcaTelaio`, `modelloTelaio` |
| **Medio** (batching state) | `richiedente`, `matricola`, `nScuderia`, `targa`, `oreLavoro`, `km`, `descrizioneAnomalia`, `noteIntervento` |
| **Basso** | `dataIngresso` (onChange per keystroke), `addettoAccettazione` (pill), `livelloCarburante` (selectOnly) |

---

## Passi per riprodurre (pre-fix)

1. Apri Scheda di Ingresso su iPhone/iPad (o emulatore mobile).
2. Modifica **Cliente**: digita un valore nuovo o parziale senza selezionare dal dropdown.
3. Senza chiudere la tastiera, tap **Salva scheda**.
4. Riapri la scheda o controlla panoramica → valore salvato vuoto o precedente, pur essendo visibile prima del save.

Varianti: `cantiere`, `marca attrezzatura`, `note intervento` + salvataggio rapido.

---

## Correzione applicata

### Fix 1 — Flush combobox al submit (SSOT)

- [`lib/ui/gestionale-form-submit-flush.ts`](../lib/ui/gestionale-form-submit-flush.ts): registry WeakMap + `flushGestionaleFormPendingCommits(form)`.
- [`global-select.tsx`](../components/gestionale/global-input/global-select.tsx): registra `commitBlur` sincrono (cancella timer blur).
- [`gestionale-form-focus-scope.tsx`](../components/gestionale/gestionale-form-focus-scope.tsx): `onSubmitCapture` chiama flush su tutti i form con `gestionaleFormFocusScopeProps()`.

### Fix 2 — Sync ref in edit modal

- [`scheda-ingresso-form-modal.tsx`](../components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx): `draftRef` aggiornato in `onPatch` / `setFields`; `flushSync` in `onSubmit` dopo capture flush.

### Fix 3 — Sync ref in create modal

- [`lavorazione-create-modal.tsx`](../components/gestionale/lavorazioni/lavorazione-create-modal.tsx): `fieldsRef` sincronizzato in `setFields` / `patch`; `onSubmit` usa `fieldsRef.current` dopo `flushSync`.

---

## Test eseguiti

| Test | Esito |
|------|-------|
| `lib/regression/scheda-ingresso-ios-save-audit.test.ts` | OK |
| `lib/schede/scheda-ingresso-roundtrip.test.ts` | OK |
| `lib/global-autocomplete/global-select-add.test.ts` | OK |
| `lib/regression/lavorazioni-inputs-audit.test.ts` | OK |

### Verifica piattaforme

| Piattaforma | Metodo | Esito atteso post-fix |
|-------------|--------|------------------------|
| Desktop | Unit test + blur naturale su click Salva | Nessuna regressione; flush idempotente |
| Android | Stesso pattern iOS (submit senza blur) | Coperto da flush capture |
| iOS Safari | Checklist manuale / Playwright viewport mobile | Combobox e textarea salvati al tap Salva |

**Checklist manuale iOS (post-fix):**

- [ ] Cliente digitato + Salva con tastiera aperta
- [ ] Cantiere / utilizzatore + Salva rapido
- [ ] Marca attrezzatura hierarchy + Salva
- [ ] Textarea nota + Salva immediato
- [ ] Creazione nuova lavorazione (create modal)
- [ ] Modifica scheda esistente (edit modal)
- [ ] Selezione da dropdown (regressione desktop)

---

## Edge case residui

- Testo combobox **non committabile** dall’engine (`strictFromList` senza match esatto): comportamento preesistente; il flush commette solo valori ammessi da `autocompleteCommitFromSearchText`.
- Data incompleta: bloccata da `assertItalianDay` in hub (messaggio validazione, non perdita silenziosa).
- Match mezzo su blur (`nScuderia` / ident): ritardo 140ms solo per autofill mezzo, non per perdita del testo digitato.

---

## Flusso post-fix

```
Tap Salva
  → onSubmitCapture: flushGestionaleFormPendingCommits (commitBlur sync)
  → onSubmit: flushSync → draftRef/fieldsRef aggiornato
  → commitIngressoSave / persist → DB
  → refetch → UI
```
