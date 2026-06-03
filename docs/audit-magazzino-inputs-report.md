# Audit campi input — Magazzino

**Data:** 2026-06-03  
**Perimetro:** `/magazzino` + modali Nuovo/Modifica ricambio e scheda info (upload foto)  
**Escluso:** log drawer, codici duplicati, sotto scorta, confirm (solo bottoni)  
**Tipo:** UX / layout / responsive / accessibilità / ancoraggio dropdown — **nessuna modifica business/API**

---

## 1. Elenco campi analizzati

### Toolbar

| Campo | Tipo | File | Stato | Note |
|-------|------|------|-------|------|
| Cerca in magazzino | `GestionaleListSearchField` (combobox + portal) | `magazzino-view.tsx` | enabled | `id="magazzino-search"`, debounce + Enter |

### Filtri avanzati (desktop + `MobileFilterDrawer`)

| Campo | Tipo | Stato |
|-------|------|-------|
| Marca ricambio | `GlobalSettingsListSelect` | enabled |
| Categoria | `GlobalSelect` selectOnly | enabled |
| Fornitore non originale | `GlobalSettingsListSelect` | enabled |
| Marca / Modello compatibilità | `GlobalHierarchyMarcaSelect` / `GlobalHierarchyModelloSelect` | modello disabled se marca = Tutti |
| Marca / Modello telaio | idem | idem |

### Tabella desktop / card mobile

Nessun input editabile — scorta via pulsanti ±/info.

### Form ricambio (`RicambioFormFields`)

| Sezione | Campi | Tipo |
|---------|-------|------|
| Identificazione | Marca, codice OE (+ secondario), descrizione, note, categoria | select + text/textarea |
| Compatibilità | 4× multi-select gerarchia | `GlobalMultiSelect` |
| Giacenza | Scorta, scorta minima | `StockStepper` number |
| Fornitore OE | Prezzo, sconto, markup | number `inputMode=decimal` |
| Alternativo | Fornitore, codice, prezzo, sconto | select + number |
| Prezzi lineari | — | display-only |

### Upload foto

`RecordImageManager` — hidden `type="file"` in create + info modal.

---

## 2. Problemi trovati (pre-fix)

| ID | Severità | Area | Problema |
|----|----------|------|----------|
| M-001 | **Medio** | Form ricambio | `RicambioField` con `<span>`; input plain senza `id`/`htmlFor` |
| M-002 | **Medio** | StockStepper | Scorta senza `inputMode="numeric"` |
| M-003 | **Medio** | Filtri | `LavorazioniFilterField` senza `htmlFor` su controlli principali |
| M-004 | **Basso** | GlobalMultiSelect | Chip remove solo `title`, no `aria-label` |
| M-005 | **Basso** | Toolbar search | Solo `aria-label` (coerente ERP) |
| M-006 | **Info** | Tabella | Nessun inline edit — by design |
| M-007 | **Info** | Compat form | Modello usa prima marca se multiple — logica business |
| M-008 | **Info** | Drawer mobile | Keyboard-aware via `MobileFilterDrawer` globale |
| M-009 | **Basso** | Performance | Debounce search intenzionale |

**Critico / Alto:** nessuno (no select/date/datalist nativi).

---

## 3. Incoerenze e duplicazioni

- Form ricambio: Global* con `aria-label` vs input plain senza label programmatica (risolto M-001).
- Filtri e form usano stessi pattern portal ERP — coerente.
- Tabella vs modale: scorta editabile solo in form, non in riga — intenzionale.

---

## 4. Problemi mobile / tastiera / dropdown

| ID | Verifica | Esito post-fix |
|----|----------|----------------|
| M-003 | 7 filtri nel drawer + tastiera | `htmlFor` + drawer keyboard-aware (L-002 lavorazioni) |
| M-001 | Form ricambio in modale scroll | `GestionaleModalScrollBody` + label associate |
| M-002 | Scorta con tastiera numerica | `inputMode="numeric"` |
| Search | Portal combobox toolbar | Già `useGlobalDropdownPortal` |

---

## 5. Correzioni applicate

| ID | File | Intervento |
|----|------|------------|
| M-001 | `ricambio-form-fields.tsx` | `RicambioField` con `htmlFor`; `id` stabili su tutti input/select plain |
| M-002 | `ricambio-form-fields.tsx` | `StockStepper`: `inputMode="numeric"`, `inputId`, `aria-label` |
| M-003 | `magazzino-advanced-filter-panel.tsx` | `htmlFor` + `id` su marca, categoria, fornitore filtri |
| M-004 | `global-multi-select.tsx` | `aria-label` su chip remove |

---

## 6. Verifica finale

- [x] Inventario perimetro pagina + modali ricambio
- [x] Nessun `type="date"`, `<select>`, `<datalist>` in tree magazzino
- [x] Form: `htmlFor`/`id` su campi plain e scorta
- [x] Filtri: `htmlFor` su controlli con `id`
- [x] Modali: `GestionaleModalScrollBody`
- [x] Regressione statica: `lib/regression/magazzino-inputs-audit.test.ts` (OK)
- [ ] QA manuale device iPhone/Android — raccomandato post-deploy

### Matrice test (code review + pattern ERP)

| Viewport | Esito atteso |
|----------|--------------|
| Desktop ≥1280px | Filtri collapse, search portal, modale centrata |
| Tablet 768px | Filtri collapse, modale responsive |
| Mobile 390px | Drawer filtri scroll + keyboard pad; form scroll modale |
| Tastiera virtuale | Campo focus visibile in drawer/modale via `handleFocusInForMobileModal` |

---

## 7. Classificazione residui

| ID | Severità | Nota |
|----|----------|------|
| M-005 | Basso | Search toolbar senza label visibile — accettabile |
| M-007 | Info | Compat multi-marca — non modificato (business) |
| M-009 | Basso | Debounce search — intenzionale |

---

*Report generato nell'ambito del piano «Audit campi Magazzino».*
