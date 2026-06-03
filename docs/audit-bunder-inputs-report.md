# Audit campi input — BUNDER

**Data:** 2026-06-03  
**Perimetro:** `/bunder` → [`bunder-view.tsx`](components/bunder/bunder-view.tsx) + [`bunder-editor-modal.tsx`](components/bunder/bunder-editor-modal.tsx)  
**Escluso:** log drawer, tabella lista (azioni), export PDF/Word/Stampa (bottoni)  
**Tipo:** UX / layout / responsive / accessibilità / ancoraggio dropdown — **nessuna modifica business/API**

---

## 1. Elenco campi analizzati

### Toolbar (1 + 13 filtri) — `PageToolbar` + `MobileFilterDrawer` mobile

| Campo | Tipo | Scopo | Stato |
|-------|------|-------|-------|
| Cerca documenti | `GestionaleSearchField` | Ricerca client-side | enabled |
| Tipo | `GlobalSelect` | Filtro tipo documento | enabled |
| Azienda, Referente, Prodotto, Codice, Settore | input text | Filtri substring | enabled |
| Creato da | `GlobalSelect` | Filtro autore | enabled |
| Importo min / max | input text | Filtro range importo | enabled |
| Data da / Data a | `GlobalDatePickerYmd` | Filtro intervallo date | enabled |
| Mese / Anno | `GlobalSelect` | Filtro periodo | enabled |

### Wizard «Nuovo documento» (1)

| Campo | Tipo | Stato |
|-------|------|-------|
| Tipo nuovo documento | `GlobalSelect` | enabled |

### Editor modale — campi fissi (~24)

| Sezione | Campi | Tipo |
|---------|-------|------|
| Intestazione | Tipo, Numero (RO), Data, Luogo, Riferimento interno | select / text RO / datepicker / text |
| Destinatario | Ragione sociale, Indirizzo, CAP, Città, Referente, Settore | text |
| Import preventivo | Preventivo | `GlobalSelect` |
| Corpo | Oggetto, Introduzione | text / textarea |
| Condizioni | IVA, Resa, Trasporto, Assemblaggio, Consegna, Pagamento, Garanzia, Validità offerta | text (8) |
| Chiusura | Clausole legali, Chiusura, Firma/note | textarea / text / textarea |

### Editor — dinamici (5×N righe prodotto)

Qtà, Codice, Nome, Descr. tecnica, Prezzo unitario — per ogni riga.

**Pattern positivi:** nessun `<select>`, `type="date"`, `<datalist>`; date via portal ERP; unsaved dialog; filtri mobile in drawer keyboard-aware.

---

## 2. Problemi trovati (pre-fix)

| ID | Severità | Area | Problema |
|----|----------|------|----------|
| BU-001 | **Medio** | Filtri (13) | Label wrapper senza `htmlFor`/`id` |
| BU-002 | **Medio** | Search | Solo `aria-label`, senza `id` stabile |
| BU-003 | **Medio** | Filtri testo | `py-1.5 md:text-xs` — font &lt;16px mobile (zoom iOS) |
| BU-004 | **Medio** | Editor scroll | Scroll custom invece di `GestionaleModalScrollBody` |
| BU-005 | **Alto** | Righe prodotto | 5 input/riga senza `aria-label` |
| BU-006 | **Medio** | Editor campi fissi | ~20 campi senza `id`/`htmlFor` |
| BU-007 | **Medio** | Number | Qtà/prezzo/importi senza `inputMode="decimal"` |
| BU-008 | **Medio** | Tabella righe | Scroll orizzontale senza landmark accessibile |
| BU-009 | **Basso** | Wizard | Select senza `htmlFor`/`id` |
| BU-010 | **Basso** | Numero RO | Readonly senza `aria-readonly` |
| BU-011 | **Basso** | Touch filtri | Input filtro sotto target 44px |
| BU-012 | **Info** | Performance | Filtri client-side senza debounce — intenzionale |

**Critico:** nessuno.

---

## 3. Incoerenze e duplicazioni

- Filtri testo «contiene» vs campi editor destinatario — scopi diversi, coerente.
- Date filtri e editor entrambi su `GlobalDatePickerYmd` — allineato.
- Righe prodotto tabella scroll vs pattern Preventivi ricambi — mitigato con `role="region"`.

---

## 4. Problemi mobile / tastiera / dropdown

| ID | Verifica | Esito post-fix |
|----|----------|----------------|
| BU-003 | Zoom iOS filtri | `globalInputFieldFilter` + `min-h-11` |
| BU-004 | Tastiera modale editor | `GestionaleModalScrollBody` |
| BU-005 | Screen reader righe | `aria-label` per colonna/riga |
| BU-001 | Drawer 13 filtri | `htmlFor` + portal GlobalSelect/DatePicker |
| BU-007 | Tastiera numerica | `inputMode="decimal"` |

### Matrice test (code review)

| Viewport | Esito atteso |
|----------|--------------|
| Desktop ≥1280px | Filtri 3 colonne, editor wide, tabella righe scroll |
| Tablet 768px | Filtri collapse, editor 2 col |
| Mobile 390×844 | Drawer filtri; modale scroll; righe prodotto scroll orizzontale |

---

## 5. Correzioni applicate

| ID | File | Intervento |
|----|------|------------|
| BU-001 | `bunder-view.tsx` | `htmlFor` + `id` su 13 filtri (`bunder-filter-*`) |
| BU-002 | idem | `id="bunder-search"` |
| BU-003 / BU-011 | idem | `bunderFilterTextInputClass` = `globalInputFieldFilter` + `min-h-11` |
| BU-007 | idem | `inputMode="decimal"` su importo min/max |
| BU-009 | idem | `htmlFor` + `id="bunder-wizard-tipo"` |
| BU-004 | `bunder-editor-modal.tsx` | `GestionaleModalScrollBody` + `gestionaleModalBodyFlexClass` |
| BU-005 | idem | `aria-label` su 5 input per riga prodotto |
| BU-006 | idem | `htmlFor` + `id` su campi fissi (`bunder-edit-*`) |
| BU-007 | idem | `inputMode="decimal"` su qtà/prezzo |
| BU-008 | idem | Wrapper tabella: `role="region"` + `aria-label` scroll |
| BU-010 | idem | Numero progressivo: `aria-readonly="true"` |

---

## 6. Verifica finale

- [x] Inventario perimetro pagina + wizard + editor
- [x] Nessun `type="date"`, `<select>`, `<datalist>` in tree bunder
- [x] Filtri: `htmlFor`, `GlobalDatePickerYmd`, `id="bunder-search"`
- [x] Editor: `GestionaleModalScrollBody`, label associate, `aria-label` righe
- [x] Regressione statica: `lib/regression/bunder-inputs-audit.test.ts` (OK)
- [ ] QA manuale device iPhone/Android — raccomandato post-deploy (drawer filtri + editor modale)

---

## 7. Classificazione residui

| ID | Severità | Nota |
|----|----------|------|
| BU-012 | Info | Filtri client-side senza debounce — intenzionale |

**Critico / Alto / Medio residui:** nessuno dopo fix BU-001…BU-011.
