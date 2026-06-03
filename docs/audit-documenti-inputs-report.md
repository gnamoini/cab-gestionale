# Audit campi input — Documenti

**Data:** 2026-06-03  
**Perimetro:** `/documenti` → `documenti-view.tsx` + modali Carica/Modifica (`documenti-modals.tsx`, `documento-file-dropzone.tsx`)  
**Escluso:** info modal (read-only), elimina confirm, log drawer, albero documenti (nessun inline edit)  
**Tipo:** UX / layout / responsive / accessibilità / ancoraggio dropdown — **nessuna modifica business/API**

---

## 1. Elenco campi analizzati

### Toolbar (1)

| Campo | Tipo | File | Stato |
|-------|------|------|-------|
| Cerca documenti | `GestionaleSearchField` (`aria-label`, debounce 320ms) | `documenti-view.tsx` | enabled |

### Filtri avanzati (4 + 5 toggle) — desktop collapse + `MobileFilterDrawer`

| Campo | Tipo | Stato |
|-------|------|-------|
| Marca | `GlobalHierarchyMarcaSelect` (typeahead) | enabled |
| Modello | `GlobalHierarchyModelloSelect` (typeahead, disabled se marca = Tutti) | enabled |
| Ordinamento | `GlobalSelect` selectOnly (8 opzioni) | enabled |
| Categoria | 5× toggle button (Tutte, Listini, Cataloghi, Manuali, Altro) | enabled |

### Albero / card mobile (0)

`ArchiveDocRow`: azioni Apri/Info, nessun input testuale.

### Modale Carica (9 max)

| Campo | Tipo | Stato |
|-------|------|-------|
| File | hidden `type="file"` + dropzone `role="button"` | enabled |
| Nome file | text | enabled |
| Tipo documento | `GlobalSelect` selectOnly | enabled |
| Applicabilità | 2× radio (fieldset + legend) | enabled |
| Marca | `GlobalAttrezzatureMarcaSelect` selectOnly | facoltativa |
| Modello | `GlobalAttrezzatureModelloSelect` selectOnly | condizionale |
| Note | textarea | facoltativa |

### Modale Modifica (5–7)

Stessi campi del carica **senza** file.

**Pattern positivi:** nessun `<select>`, `type="date"`, `<datalist>`; modali usano `GestionaleModalScrollBody`; drawer filtri keyboard-aware (`mobile-filter-drawer.tsx`).

---

## 2. Problemi trovati (pre-fix)

| ID | Severità | Area | Problema |
|----|----------|------|----------|
| D-001 | **Medio** | Filtri | Label Ordinamento senza `htmlFor`; Marca/Modello mitigati da `aria-label` su hierarchy |
| D-002 | **Medio** | Categoria filtri | Toggle button senza `aria-pressed` |
| D-003 | **Medio** | Modali upload/edit | Nome, note, categoria: label wrapper ma input senza `id`/`htmlFor` |
| D-004 | **Basso** | Dropzone | Hidden file input `sr-only` senza nome accessibile esplicito |
| D-005 | **Basso** | Categoria toggle touch | Chip categoria con `py-2` senza `min-h-11` |
| D-006 | **Basso** | Toolbar search | Solo `aria-label` (coerente ERP) |
| D-007 | **Info** | Filtri vs modali | Filtri marca typeahead vs modali `selectOnly` — intenzionale |
| D-008 | **Info** | Albero | Nessun inline edit — modifica via modal |
| D-009 | **Info** | Drawer mobile | Già keyboard-aware — verificare in QA |
| D-010 | **Basso** | Performance | Debounce search 320ms — intenzionale |

**Critico / Alto:** nessuno.

---

## 3. Incoerenze e duplicazioni

- Filtri Marca/Modello usano label custom inline (non `LavorazioniFilterField`); hierarchy combobox mitigati da `aria-label` — allineato `htmlFor` solo dove `GlobalSelect` supporta `id`.
- Modali marca/modello: `aria-label` su `GlobalAttrezzature*Select` (no `id` prop su hierarchy — non esteso per evitare cambio API).

---

## 4. Problemi mobile / tastiera / dropdown

| ID | Verifica | Esito post-fix |
|----|----------|----------------|
| D-001 | Screen reader su ordinamento | `htmlFor` + `id="doc-filter-sort"` |
| D-002 | Stato chip categoria | `aria-pressed={on}` |
| D-005 | Touch target chip mobile | `min-h-11` su toggle categoria |
| D-003 | Focus label → campo modale | `id`/`htmlFor` su nome, categoria, note |
| D-004 | File picker accessibile | `id="doc-upload-file"` + label `htmlFor` |
| D-009 | Drawer + 9 portal combobox | Code review: `MobileFilterDrawer` keyboard-aware |

### Matrice test (code review)

| Viewport | Esito atteso |
|----------|--------------|
| Desktop ≥1280px | Filtri espansi, modale upload, hierarchy typeahead filtri |
| Tablet 768px | Filtri collapse, modale larghezza adeguata |
| Mobile 390×844 / 360×800 | Drawer filtri + portal combobox; modale scroll + dropzone; radio applicabilità |

**Casi critici verificati (statico):** search debounce, sort selectOnly, modal marca/modello selectOnly, dropzone + file picker, category toggles.

---

## 5. Correzioni applicate

| ID | File | Intervento |
|----|------|------------|
| D-001 | `documenti-advanced-filter-panel.tsx` | `htmlFor` + `id="doc-filter-sort"` su `GlobalSelect` ordinamento |
| D-002 | idem | `aria-pressed={on}` su ogni button categoria |
| D-005 | idem | `min-h-11` su chip categoria |
| D-003 | `documenti-modals.tsx` | `id`/`htmlFor`: `doc-upload-nome`, `doc-upload-categoria`, `doc-upload-note`; `doc-edit-nome`, `doc-edit-categoria`, `doc-edit-note` |
| D-004 | `documento-file-dropzone.tsx` | `id="doc-upload-file"` + label «File» con `htmlFor` |

---

## 6. Verifica finale

- [x] Inventario perimetro pagina + modali Carica/Modifica
- [x] Nessun `type="date"`, `<select>`, `<datalist>` in tree documenti
- [x] Filtri: `aria-pressed` categoria, `htmlFor` ordinamento
- [x] Modali: `GestionaleModalScrollBody`, `id`/`htmlFor` su nome/note/categoria
- [x] Dropzone: `id` file input + label associata
- [x] Regressione statica: `lib/regression/documenti-inputs-audit.test.ts` (OK)
- [ ] QA manuale device iPhone/Android — raccomandato post-deploy (dropdown + tastiera)

---

## 7. Classificazione residui

| ID | Severità | Nota |
|----|----------|------|
| D-006 | Basso | Search: `aria-label` sufficiente (pattern ERP) |
| D-007 | Info | Typeahead filtri vs selectOnly modali — design intenzionale |
| D-008 | Info | Albero read-only |
| D-009 | Info | Drawer keyboard-aware — smoke manuale consigliato |
| D-010 | Basso | Debounce 320ms intenzionale |

**Critico / Alto / Medio residui:** nessuno dopo fix D-001…D-005.
