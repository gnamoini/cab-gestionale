# Audit funzionale — Scheda di Ingresso

**Data:** 2026-06-08  
**Scope:** Modal Scheda di Ingresso (`SchedaIngressoEditModal`, `LavorazioneCreateModal`) — salvataggio, visualizzazione, multiriga mobile.  
**Logica di business:** non modificata.

---

## 1. Mappa completa campi

Modello SSOT: `SchedaIngressoFields` in [`types/schede.ts`](../types/schede.ts) (19 campi stringa).

### Sezione Ingresso

| Campo | Tipo UI | Obbl. | Salvataggio | Caricamento | Visualizzazione |
|-------|---------|-------|-------------|-------------|-----------------|
| `dataIngresso` | `GlobalDatePicker` | Sì (create + `assertItalianDay` in hub) | `ingresso.campi` + `lavorazioni.data_ingresso` | Bundle RQ / `normalizeSchedaIngressoFields` | Panoramica, tabella, kanban/card, PDF |
| `addettoAccettazione` | `GlobalFixedListPillSelect` | No | `ingresso.campi` | Bundle + default addetto su create | Panoramica (pill), tabella/kanban/card, PDF |
| `stato` | Pill (solo create) | No | `lavorazioni.stato` | — | Tabella stato |
| `priorita` | Pill (solo create) | No | `lavorazioni.priorita` | — | Tabella/card priorità |

### Anagrafica cliente

| Campo | Tipo UI | Obbl. | Salvataggio | Caricamento | Visualizzazione |
|-------|---------|-------|-------------|-------------|-----------------|
| `cliente` | `GlobalSettingsListSelect` | Sì (create) | `ingresso.campi` + upsert mezzo | Bundle / autofill | Panoramica, tabella, kanban, PDF, header schede lav/ric |
| `cantiere` | List select | No | idem | idem | idem |
| `utilizzatore` | List select | No | idem | idem | idem |
| `richiedente` | `<input>` (`TEXT_SHORT` 120) | No | `ingresso.campi` | idem | Panoramica card Ingresso, PDF Cliente |

### Attrezzatura

| Campo | Tipo UI | Obbl. | Salvataggio | Caricamento | Visualizzazione |
|-------|---------|-------|-------------|-------------|-----------------|
| `tipoAttrezzatura` | List select | No | `ingresso.campi` + mezzo | idem | Panoramica, archivio, PDF |
| `marcaAttrezzatura` | `CompatHierarchySelect` | Sì (create) | idem | idem | Tabella Attrezzatura, kanban, PDF |
| `modelloAttrezzatura` | Hierarchy | No | idem | idem | idem |
| `matricola` | Autocomplete ident | No | idem + mezzo match | idem | Ident, tabella, PDF |
| `nScuderia` | `<input>` mono (blur match) | No | idem | idem | idem |

### Telaio

| Campo | Tipo UI | Obbl. | Salvataggio | Visualizzazione |
|-------|---------|-------|-------------|-----------------|
| `tipoTelaio` | List select | `ingresso.campi` | Panoramica, archivio (subline), PDF |
| `marcaTelaio` | Hierarchy | idem | idem |
| `modelloTelaio` | Hierarchy | idem | idem |
| `targa` | Autocomplete ident | idem + mezzo match | Ident, tabella, PDF |

### Dettagli tecnici

| Campo | Tipo UI | Salvataggio | Visualizzazione |
|-------|---------|-------------|-----------------|
| `oreLavoro` | `input[type=number]` `inputMode=decimal` | `ingresso.campi` | Panoramica, PDF Attrezzatura |
| `km` | `input[type=number]` `inputMode=numeric` | idem | Panoramica, PDF Telaio |
| `livelloCarburante` | `GlobalSelect` (Vuoto…Pieno) | idem | Panoramica, PDF Telaio |

### Intervento (multiriga)

| Campo | Tipo | Max | Salvataggio | Visualizzazione |
|-------|------|-----|-------------|-----------------|
| `descrizioneAnomalia` | `<textarea>` | 8000 (`TEXT_EXTRA`) | Solo `ingresso.campi` | Panoramica (`pre-wrap`), PDF multiline, filtri/ricerca — **non** colonna Note |
| `noteIntervento` | `<textarea>` | 2000 (`TEXT_LONG`) | `ingresso.campi` + sync `lavorazioni.note` | Panoramica, hub note, tabella/card/kanban (`line-clamp-2`), PDF |

**Persistenza DB:** `scheda_lavorazione` (`tipo = ingresso`), JSON `contenuto.doc.campi.*` via [`schede-db-mapper.ts`](../lib/schede/schede-db-mapper.ts) → [`schede-sync-adapter.ts`](../lib/schede/schede-sync-adapter.ts).

**Sync incrociato (by design):**

- `noteIntervento` ↔ `lavorazioni.note` — [`syncIngressoToBackend`](../components/gestionale/lavorazioni/lavorazioni-view.tsx)
- `dataIngresso` ↔ `lavorazioni.data_ingresso`
- Anagrafica mezzo ↔ `mezzi` — `upsertMezzoFromSchedaIngresso` (richiede `cliente` + `marcaAttrezzatura`)
- `descrizioneAnomalia` **non** sincronizza su `lavorazioni.note` — [`lavorazione-display-helpers.ts`](../lib/lavorazioni/lavorazione-display-helpers.ts)

---

## 2. Test di salvataggio

### Automatizzati (eseguiti)

| Test | File | Esito |
|------|------|-------|
| Normalizzazione campi legacy / parziali | `lib/schede/scheda-ingresso-roundtrip.test.ts` | OK |
| Clamp multiriga + limiti TEXT_EXTRA/TEXT_LONG | idem | OK |
| Payload DB `bundleToSchedaPayloads` | idem | OK |
| Priorità `noteIntervento` su `lavorazione.note` | idem | OK |
| PDF sezioni e campi | `lib/pdf/ingresso-pdf-layout.test.ts` | OK |
| Merge / copia ultima scheda | `lib/schede/scheda-ingresso-reuse.test.ts` | OK (preesistente) |
| Upsert mezzo da scheda | `lib/mezzi/upsert-mezzo-from-scheda.test.ts` | OK (preesistente) |

### Matrice manuale consigliata (staging)

Per ogni campo: inserimento → modifica → salva → riapri modal → F5 → verifica valore in panoramica e tabella.

**Casi speciali:**

- Autofill mezzo (targa/matricola/scuderia esatta)
- Copia ultima scheda ingresso
- Edit note da hub panoramica vs modal scheda (stesso campo `noteIntervento`)
- Scheda `sorgente: file_esterno` (solo sync note)

**Edge case multiriga verificati in unit test:**

- Newline `\n`, righe vuote, tab, caratteri `àèù & < > " '`, emoji
- Troncamento a 8000 / 2000 caratteri senza perdita parziale oltre il limite

---

## 3. Test visualizzazione

| Superficie | File | Campi | Esito audit |
|------------|------|-------|-------------|
| Panoramica completa | `scheda-ingresso-panoramica-view.tsx` | Tutti i 19 | OK — `whitespace-pre-wrap` su multiriga |
| Hub tab Panoramica | `schede-lavorazione-modal.tsx` | Anagrafica + note | Parziale (vedi P2) |
| Tabella in corso/archivio | `lavorazioni-view.tsx` | Subset + note clamp | OK — by design |
| Kanban | `lavorazioni-kanban-view.tsx` | Subset via `lavorazioneNoteOperative` | OK |
| Mobile card | `lavorazione-mobile-card.tsx` | Subset + `line-clamp-2` | OK anteprima |
| Portale clienti | `client-lavorazione-ingresso-dialog.tsx` | Panoramica (no addetto) | OK |
| PDF ingresso | `ingresso-pdf-layout.ts` | Tutti (sezioni filtrate) | OK — `multiline: true` |

Audit statico: `lib/regression/scheda-ingresso-display-audit.test.ts` — **OK**.

---

## 4. Campi multiriga

Solo **`descrizioneAnomalia`** e **`noteIntervento`** nel modal.

Formattazione preservata in:

- DB / bundle (no trim su multiriga in `clampIngressoCampi`)
- Panoramica (`multilineValue` + `pre-wrap`)
- PDF (`drawIngressoPdfBody` con `multiline: true`)

---

## 5. Navigazione focus e mobile Enter

### Problema P1 (risolto)

Prima della correzione, `gestionaleFormFocusScopeProps()` intercettava Enter su **tutte** le textarea: focus al campo successivo invece di newline.

### Correzione applicata

Aggiunto `data-gestionale-enter="ignore"` su entrambe le textarea in [`scheda-ingresso-form-modal.tsx`](../components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx).

- **Input singola riga:** Enter continua ad avanzare il focus (invariato).
- **Textarea scheda ingresso:** Enter inserisce newline nativa; Shift+Enter invariato.
- **Combobox / date picker / ident autocomplete:** handler Enter custom invariati.

Verifica: `lib/ui/gestionale-focus-navigation.test.ts`, `lib/regression/lavorazioni-inputs-audit.test.ts`.

---

## 6. Mobile UX

| Aspetto | Implementazione | Esito |
|---------|-----------------|-------|
| Scroll modal | `GestionaleModalScrollBody` nel form | OK |
| Tastiera / viewport | `useMobileModalKeyboard` su `LavorazioniModalShell` | OK (static) |
| Font iOS anti-zoom | `dsInput` su textarea | OK (condiviso con input) |
| Enter multiriga | Fix P1 | OK |
| Cursore visibile / campo coperto | Scroll on focus via hook mobile | Da verificare su device fisici |

**Checklist device (manuale):** Android Chrome, Samsung Internet, iOS Safari — focus textarea in fondo form, inserimento 3+ righe con Invio, nessun salto campo.

---

## 7. Edge case

| Scenario | Esito |
|----------|-------|
| Testo al limite (8000/2000) | OK — clamp in `clampSchedeBundle` |
| Molte righe | OK — preservate in roundtrip test |
| Caratteri speciali / emoji | OK — roundtrip test |
| Record legacy campi mancanti | OK — `normalizeSchedaIngressoFields` |
| Trim campi corti al save | OK — `clampTextTrimmed` su select/text corti, non su multiriga |

---

## 8. Regression check

| Area | Esito |
|------|-------|
| Salvataggio / validazioni create | Non modificato |
| `syncIngressoToBackend` / upsert mezzo | Non modificato |
| Enter su input singola riga | Invariato |
| Autofill / copia ultima scheda | Non modificato |
| Altri form con focus scope | Non modificati (fix scoped alle 2 textarea ingresso) |

---

## Problemi trovati

| ID | Severità | Problema | Stato |
|----|----------|----------|-------|
| **P1** | Alta | Enter su textarea non inseriva newline (focus advance) | **Risolto** |
| P2 | Media | Hub panoramica: solo anagrafica + note, non card Ingresso/Intervento complete | Aperto (intenzionale UX hub) |
| P3 | Bassa | `descrizioneAnomalia` assente in tabella/card | By design |
| P4 | Bassa | Note in anteprima tabella/card con `line-clamp-2` | By design |
| P5 | Info | Doppio path edit `noteIntervento` (hub vs modal) | Verificato — stesso campo bundle, sync coerente |
| P6 | Info | `client-portal-timeline.ts` non usato in UI | Codice preparatorio |

---

## Campi non sincronizzati (intenzionali)

| Campo | Non sincronizza su | Motivo |
|-------|-------------------|--------|
| `descrizioneAnomalia` | `lavorazioni.note`, colonna Note | Separazione anomalia vs note operative |
| `oreLavoro`, `km`, `livelloCarburante` | Tabella lavorazioni | Solo panoramica/PDF |
| `richiedente` | Tabella | Solo panoramica/PDF card Ingresso |

---

## Correzioni applicate

1. **`data-gestionale-enter="ignore"`** su textarea Descrizione anomalia e Note — [`scheda-ingresso-form-modal.tsx`](../components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx)
2. Test regressione:
   - `lib/ui/gestionale-focus-navigation.test.ts`
   - `lib/schede/scheda-ingresso-roundtrip.test.ts`
   - `lib/regression/scheda-ingresso-display-audit.test.ts`
   - Estensione `lib/regression/lavorazioni-inputs-audit.test.ts`

---

## Verifiche per superficie

| Verifica | Esito |
|----------|-------|
| Multilinea mobile (Enter = newline) | OK (fix + test statici) |
| Card mobile | OK — subset campi, note clamp |
| Tabella | OK — subset + `lavorazioneNoteOperative` |
| Dettagli / panoramica | OK — tutti i campi, multiriga corretta |
| PDF | OK — unit test layout |
| Regressioni navigazione / salvataggio | OK — scope minimo |

---

## Rischi residui

1. **Hub panoramica parziale (P2):** km, ore, carburante, anomalia visibili solo aprendo il modal scheda o PDF/portale.
2. **Anteprima note troncata (P4):** multiriga completa solo in dettaglio.
3. **Test E2E browser:** non aggiunto in questo audit; consigliato `e2e/smoke/13-scheda-ingresso.spec.ts` per round-trip UI su staging.
4. **Device fisici:** checklist mobile da eseguire manualmente su Android/iOS reali.

---

## Comandi test audit

```bash
npx tsx lib/ui/gestionale-focus-navigation.test.ts
npx tsx lib/schede/scheda-ingresso-roundtrip.test.ts
npx tsx lib/regression/scheda-ingresso-display-audit.test.ts
npx tsx lib/regression/lavorazioni-inputs-audit.test.ts
npx tsx lib/pdf/ingresso-pdf-layout.test.ts
```
