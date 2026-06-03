# Audit campi input — Lavorazioni

**Data:** 2026-06-03  
**Perimetro:** `/lavorazioni` + modali aperti dalla pagina (`LavorazioneCreateModal`, `SchedeLavorazioneModal`, `SchedaIngressoEditModal`)  
**Escluso:** `lavorazioni-modals.tsx` (Impostazioni), `/lavorazioni-clienti`, Kanban (nessun campo editabile)  
**Tipo:** UX / layout / responsive / accessibilità / ancoraggio dropdown — **nessuna modifica business/API**

Riferimento parziale create modal: [`audit-lavorazione-create-modal.md`](audit-lavorazione-create-modal.md).

---

## 1. Elenco campi analizzati

### Toolbar

| Campo | Tipo | File | Stato | Note |
|-------|------|------|-------|------|
| Cerca lavorazioni | `input type="search"` (`GestionaleSearchField`) | `lavorazioni-view.tsx` | enabled | `id="lavorazioni-search"`, debounce 320ms |

### Filtri avanzati (desktop + `MobileFilterDrawer`)

| Campo | Tipo | File | Stato |
|-------|------|------|-------|
| Data ingresso da / a | `GlobalFilterDateField` | `lavorazioni-advanced-filter-panel.tsx` | enabled |
| Data completamento da / a | idem | idem | enabled |
| Cliente / Cantiere / Utilizzatore | `GlobalSettingsListSelect` | idem | enabled |
| Addetto / Stato | `GlobalSelect` selectOnly | idem | enabled |
| Marca / Modello | `GlobalSelect` strictFromList | idem | Modello **disabled** se marca = Tutti |

### Tabella desktop / card mobile (in corso)

| Campo | Tipo | Stato |
|-------|------|-------|
| Stato / Priorità / Addetto | `InlineSelectField` `tablePill` → `GlobalFixedListPillSelect` | disabled se `loading` / `!canEditWorkOrders` / addetti vuoti |

Archivio: pill readonly (non input).

### Create / edit ingresso (`SchedaIngressoFormBody`)

| Campo | Tipo | Stato |
|-------|------|-------|
| Data ingresso | `GlobalDatePicker` | required; disabled se `pending \|\| readOnly` |
| Stato iniziale / Priorità / Addetto | `GlobalFixedListPillSelect` | create only per stato/priorità |
| Anagrafica (cliente, cantiere, …) | `GlobalSettingsListSelect` / hierarchy / ident autocomplete / text | vedi `scheda-ingresso-anagrafica-fields.tsx` |
| Ore lavoro / KM | `input type="number"` | disabled se form disabled |
| Carburante | `GlobalSelect` selectOnly | enabled |
| Descrizione anomalia / Note | `textarea` | maxLength TEXT_EXTRA / TEXT_LONG |

### Schede hub (`SchedeLavorazioneModal`)

| Campo | Tipo | Stato |
|-------|------|-------|
| Note operative | `textarea` | disabled se `!canEditWorkOrders` o saving |
| Stage lavorazioni — data | `GlobalDatePicker` (ex `SchedaDayField`) | RO se `file_esterno` |
| Stage lavorazioni — testo / addetto / ore | textarea / `GlobalSettingsListSelect` / number `inputMode=decimal` | idem |
| Stage ricambi — search magazzino | `GestionaleSearchField` + portal | nascosto in RO |
| Ricambio / codice / qtà | text / number | RO in archivio scheda |
| Addetto riga | `GlobalSettingsListSelect` (ex datalist) | edit only |
| Data utilizzo | `GlobalDatePicker` compatto | edit only |
| Documenti | `GestionaleFileInput` / hidden PDF | `!canEditWorkOrders` |

---

## 2. Problemi trovati (pre-fix)

| ID | Severità | Area | Problema |
|----|----------|------|----------|
| L-001 | **Alto** | Ricambi addetto | `input` + `<datalist>`: elenco OS non ancorato su mobile |
| L-002 | **Alto** | Filtri mobile drawer | Scroll senza marker keyboard-aware; rischio campo coperto da tastiera |
| L-003 | **Medio** | Date schede | `SchedaDayField` testo vs `GlobalDatePicker` su ingresso — UX incoerente |
| L-004 | **Medio** | A11y | Filtri e textarea create senza `id`/`htmlFor` espliciti |
| L-005 | **Medio** | Number ingresso | Ore lavoro/KM senza `inputMode` — spinner/stepper OS su mobile |
| L-006 | **Medio** | Ricambi search | Portal già con `max-h` e `data-cab-ios-no-focus-scroll` — da mantenere |
| L-007 | **Basso** | Toolbar search | Solo `aria-label` (coerente ERP) |
| L-008 | **Basso** | `InlineSelectField` | Fallback `<select>` nativo non usato su `/lavorazioni` |
| L-009 | **Basso** | Performance | Debounce search 320ms intenzionale |

**Critico:** nessuno.

---

## 3. Incoerenze e duplicazioni

- **Addetto:** pannello lavorazioni usa `GlobalSettingsListSelect`; ricambi usava datalist (risolto L-001).
- **Date:** ingresso create usa portal calendar; righe schede usavano campo testo + «Oggi» (allineato L-003).
- **Select nativi:** tabella usa pill portal; impostazioni (`LavorazioniModalSelect`) fuori perimetro.

---

## 4. Problemi mobile / tastiera / dropdown

| ID | Verifica | Esito post-fix |
|----|----------|----------------|
| L-001 | Addetto ricambi su 390px | Menu portal ancorato |
| L-002 | 12 filtri nel drawer + tastiera | `data-cab-modal-root` + scroll keyboard pad |
| L-003 | Data riga lavorazioni/ricambi | Calendar portal, non fullscreen OS |
| L-006 | Cerca magazzino con tastiera | Lista sotto campo, max-h limitata |

---

## 5. Correzioni applicate

| ID | File | Intervento |
|----|------|------------|
| L-001 | `schede-lavorazione-modal.tsx` | Addetto ricambi → `GlobalSettingsListSelect` `lavorazioni:addetti` |
| L-002 | `mobile-filter-drawer.tsx` | `data-cab-modal-root` + `data-cab-modal-scroll` + `cabModalScrollKeyboardPad` |
| L-003 | `schede-lavorazione-modal.tsx` | `SchedaDayField` edit → `GlobalDatePicker` + pulsante Oggi |
| L-004 | `lavorazioni-filter-fields.tsx`, `lavorazioni-advanced-filter-panel.tsx`, `gestionale-form-section.tsx`, `scheda-ingresso-form-modal.tsx` | `htmlFor` + `id` su filtri date e textarea create |
| L-005 | `scheda-ingresso-anagrafica-fields.tsx` | `inputMode="decimal"` su ore lavoro e KM |
| L-008 | `lib/regression/lavorazioni-inputs-audit.test.ts` | Assert `tablePill` su view, no datalist ricambi |

---

## 6. Verifica finale

- [x] Inventario perimetro pagina + modali
- [x] L-001: nessun `<datalist>` addetti ricambi
- [x] L-002: drawer filtri keyboard-aware
- [x] L-003/L-005: date e number allineati pattern ERP
- [x] L-004: `htmlFor` filtri + campi principali create
- [x] Regressione statica: `lib/regression/lavorazioni-inputs-audit.test.ts` (OK)
- [ ] QA manuale device iPhone/Android — raccomandato post-deploy
- [ ] E2E Playwright — richiede browser installati in locale

---

## 7. Classificazione residui

| ID | Severità | Nota |
|----|----------|------|
| L-007 | Basso | Search toolbar senza label visibile — accettabile |
| L-009 | Basso | Debounce 320ms — comportamento intenzionale |
| — | Basso | `input type="time"` non presente su lavorazioni |

---

*Report generato nell’ambito del piano «Audit campi Lavorazioni».*
