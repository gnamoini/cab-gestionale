# Audit campi input — Preventivi

**Data:** 2026-06-03  
**Perimetro:** `/preventivi` + modale editor create/edit (`PreventiviEditorModal`)  
**Escluso:** log drawer, elimina confirm, unsaved/mezzo dialog (solo bottoni)  
**Tipo:** UX / layout / responsive / accessibilità / ancoraggio dropdown — **nessuna modifica business/API**

---

## 1. Elenco campi analizzati

### Toolbar

| Campo | Tipo | File | Stato |
|-------|------|------|-------|
| Cerca preventivi | `GestionaleListSearchField` | `preventivi-view.tsx` | enabled |

### Filtri avanzati (desktop + `MobileFilterDrawer`)

| Campo | Tipo | Stato |
|-------|------|-------|
| Data creazione da / a | `GlobalFilterDateField` | enabled |
| Cliente / Cantiere / Utilizzatore | `GlobalSettingsListSelect` | enabled |
| Stato / Tipo documento | `GlobalSelect` | enabled |
| Marca / Modello | `GlobalSelect` | modello disabled se marca = Tutti |

### Tabella / card mobile

Nessun input editabile — azioni Modifica/PDF/Elimina.

### Editor modale

| Sezione | Campi | Tipo |
|---------|-------|------|
| Dati documento | Numero (RO), tipo (segmented tabs), data | text/datepicker |
| Anagrafica | 16 campi | `SchedaIngressoAnagraficaFields` |
| Lavorazioni | textarea | text |
| Ricambi | 5×N righe | text + number |
| Materiali consumo | qtà RO + prezzo | number |
| Manodopera | costo orario, ore/importo RO, addetti | number + text |
| Collaudo | prezzo | number |
| Note | textarea | text |

---

## 2. Problemi trovati (pre-fix)

| ID | Severità | Area | Problema |
|----|----------|------|----------|
| P-001 | **Alto** | Tabella ricambi | 5 input/riga senza `aria-label` |
| P-002 | **Medio** | Collaudo prezzo | Manca `htmlFor`, `inputMode`, `aria-label` |
| P-003 | **Medio** | Filtri date | `LavorazioniFilterField` senza `htmlFor` |
| P-004 | **Medio** | Number inputs | Ricambi/manodopera/materiali senza `inputMode="decimal"` |
| P-005 | **Medio** | Editor FormField | Data, lavorazioni, costo orario, note senza `id`/`htmlFor` |
| P-006 | **Medio** | Mobile ricambi | Tabella `min-w-[960px]` scroll orizzontale |
| P-007 | **Basso** | Tipo documento | Segment touch target piccolo su mobile |
| P-008 | **Basso** | Toolbar search | Solo `aria-label` (coerente ERP) |
| P-009 | **Info** | Anagrafica | Mitigato da `aria-label` su Global* |
| P-010 | **Basso** | Performance | Debounce search intenzionale |

**Critico:** nessuno.

---

## 3. Incoerenze e duplicazioni

- Riga addetti ore aveva `inputMode="decimal"`; ricambi no (allineato P-004).
- Filtri date: pattern diverso da lavorazioni pre-fix (risolto P-003).

---

## 4. Problemi mobile / tastiera / dropdown

| ID | Verifica | Esito post-fix |
|----|----------|----------------|
| P-001 | Screen reader su righe ricambi | `aria-label` per colonna/riga |
| P-004 | Tastiera numerica ricambi | `inputMode="decimal"` |
| P-006 | Scroll tabella in modale | `role="region"` + label scroll |
| P-003 | Drawer 9 filtri + tastiera | `htmlFor` date + drawer keyboard-aware |

---

## 5. Correzioni applicate

| ID | File | Intervento |
|----|------|------------|
| P-001 | `preventivi-editor-modal.tsx` | `aria-label` su 5 input per riga ricambi |
| P-002 | idem | Collaudo: `id`, `htmlFor`, `inputMode`, `aria-label` |
| P-003 | `preventivi-advanced-filter-panel.tsx` | `htmlFor` + `id` date creazione da/a |
| P-004 | `preventivi-editor-modal.tsx` | `inputMode="decimal"` su number ricambi, costo orario, materiali |
| P-005 | idem | `useId` + `htmlFor` su data, lavorazioni, costo orario, note |
| P-006 | idem | Wrapper tabella: `role="region"` + `aria-label` scroll |
| P-007 | idem | Segment tipo documento: `max-sm:min-h-11 max-sm:py-2` |

---

## 6. Verifica finale

- [x] Inventario perimetro pagina + editor
- [x] Nessun `type="date"`, `<select>`, `<datalist>` in tree preventivi
- [x] Ricambi: `aria-label` per riga
- [x] Filtri date: `htmlFor` + `id`
- [x] Editor: `GestionaleModalScrollBody`
- [x] Regressione statica: `lib/regression/preventivi-inputs-audit.test.ts` (OK)
- [ ] QA manuale device iPhone/Android — raccomandato post-deploy

### Matrice test (code review)

| Viewport | Esito atteso |
|----------|--------------|
| Desktop ≥1280px | Filtri espansi, editor centrato, tabella ricambi scroll |
| Tablet 768px | Filtri collapse, editor responsive |
| Mobile 390px | Drawer filtri + keyboard; modale scroll; ricambi scroll orizzontale |

---

## 7. Classificazione residui

| ID | Severità | Nota |
|----|----------|------|
| P-008 | Basso | Search toolbar senza label visibile |
| P-009 | Info | Anagrafica condivisa — fix parziali in audit magazzino |
| P-010 | Basso | Debounce search intenzionale |
| P-006 | Medio | Layout tabella wide accettato; scroll documentato |

---

*Report generato nell'ambito del piano «Audit campi Preventivi».*
