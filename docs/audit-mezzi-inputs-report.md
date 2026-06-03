# Audit campi input — Mezzi (re-audit)

**Data:** 2026-06-03  
**Perimetro:** `/mezzi` → [`mezzi-view.tsx`](components/gestionale/mezzi/mezzi-view.tsx), filtri ([`mezzi-filters.tsx`](components/gestionale/mezzi/mezzi-filters.tsx)), modali Nuovo/Modifica (`MezzoFormFields`), hub dettaglio tab Foto (`RecordImageManager`)  
**Escluso:** log drawer, elimina confirm, hub read-only (panoramica/lavorazioni/preventivi/documenti)  
**Tipo:** UX / layout / responsive / accessibilità / ancoraggio dropdown — **nessuna modifica business/API**

---

## 1. Elenco campi analizzati

### Toolbar (1)

| Campo | Tipo | Scopo | Stato | File |
|-------|------|-------|-------|------|
| Cerca mezzi | `GestionaleSearchField` (`id="mezzi-search"`, `aria-label`) | Ricerca client-side lista | enabled | `mezzi-filters.tsx` via `PageToolbar` |

### Filtri avanzati (6) — collapse desktop + `MobileFilterDrawer` su mobile

| Campo | Tipo | Scopo | Stato |
|-------|------|-------|-------|
| Cliente | input text | Filtro substring cliente | enabled |
| Marca | input text | Filtro substring marca attrezzatura | enabled |
| Modello | input text | Filtro substring modello | enabled |
| Targa | input text (mono) | Filtro substring targa | enabled |
| N. scuderia | input text (mono) | Filtro substring numero scuderia | enabled |
| Ultima lavorazione | `GlobalSelect` selectOnly (5 opzioni) | Filtro client-side per interventi | enabled |

### Tabella / card mobile (0)

Nessun input editabile — azioni Hub/Elimina.

### Modale Nuovo / Modifica — `MezzoFormFields` (14 campi)

| Sezione | Campo | Tipo | Scopo | Stato |
|---------|-------|------|-------|-------|
| Cliente | Cliente * | `GlobalSettingsListSelect` | Anagrafica committente | required |
| | Cantiere | `GlobalSettingsListSelect` | Sede/cantiere | enabled |
| | Utilizzatore | `GlobalSettingsListSelect` | Operatore/utilizzatore | enabled |
| Attrezzatura | Tipo attrezzatura | `GlobalSettingsListSelect` | Categoria macchina | enabled |
| | Marca * | `GlobalHierarchyMarcaSelect` | Marca attrezzatura | required |
| | Modello | `GlobalHierarchyModelloSelect` | Modello attrezzatura | enabled |
| | Matricola | input text (mono) | Identificativo fabbrica | enabled |
| | N. scuderia | input text (mono) | Numero interno team | enabled |
| | Ore lavoro | input number | Contatore ore | enabled |
| Telaio | Tipo telaio | `GlobalSettingsListSelect` | Categoria telaio | enabled |
| | Marca | `GlobalHierarchyMarcaSelect` | Marca telaio | enabled |
| | Modello | `GlobalHierarchyModelloSelect` | Modello telaio | enabled |
| | Targa | input text (mono) | Targa veicolo | enabled |
| | KM | input number | Contatore chilometri | enabled |

**Nota:** `anno` presente nello state form/salvataggio ma non esposto in UI — intenzionale (default anno corrente).

### Hub — tab Foto (1)

| Campo | Tipo | Scopo | Stato |
|-------|------|-------|-------|
| Upload foto | `RecordImageManager` → `GestionaleFileInput` | Allegati immagine mezzo | enabled se `canEdit` |

**Pattern positivi:** modali con `GestionaleModalScrollBody`; combobox portal ERP; nessun `<select>`, `<datalist>` o `type="date"`; filtri mobile via `PageToolbar` → `MobileFilterDrawer` (keyboard-aware).

---

## 2. Problemi trovati (pre-fix)

| ID | Severità | Area | Problema |
|----|----------|------|----------|
| MZ-001 | **Medio** | Filtri | Label visuale ma input senza `id`/`htmlFor` |
| MZ-002 | **Medio** | Filtro ultima lav. | `<select>` nativo — dropdown OS, ancoraggio mobile debole |
| MZ-003 | **Medio** | Form mezzo | Input plain senza `id`/`htmlFor` |
| MZ-004 | **Medio** | Form numerici | Ore/KM senza `inputMode="numeric"` |
| MZ-005 | **Medio** | Form combobox | `GlobalSettingsListSelect` senza `id`/`htmlFor` |
| MZ-006 | **Basso** | Toolbar search | Solo `aria-label`, senza `id` stabile |
| MZ-007 | **Info** | Form | Campo `anno` non in UI |
| MZ-008 | **Info** | Hierarchy form | Marca/modello: `aria-label` (no `id` prop su GlobalHierarchy*) |
| MZ-009 | **Info** | Hub foto | Upload via `GestionaleFileInput` condiviso (`htmlFor`+`useId` interno) |
| MZ-010 | **Basso** | Performance | Filtri client-side senza debounce — intenzionale |
| MZ-011 | **Basso** | Filtri touch | Input filtro `min-h-10` sotto target 44px |
| MZ-012 | **Basso** | Search | Manca `id="mezzi-search"` (allineamento ERP) |

**Critico / Alto:** nessuno.

---

## 3. Incoerenze e duplicazioni

- Filtri testuali «Contiene…» vs combobox form — scopi diversi (substring vs anagrafica strutturata), coerente.
- Ultima lavorazione era l'unico `<select>` nativo (risolto MZ-002).
- Placeholder filtri omogenei «Contiene…» — accettabile.
- Filtri testuali vs hierarchy typeahead in form — intenzionale (filtro rapido vs selezione guidata).

---

## 4. Problemi mobile / tastiera / dropdown

| ID | Verifica | Esito post-fix |
|----|----------|----------------|
| MZ-002 | Select nativo + tastiera | `GlobalSelect` portal ancorato |
| MZ-001 | Screen reader filtri | `htmlFor` su 6 filtri |
| MZ-003 | Label → focus modale | `htmlFor` + `id` su plain input |
| MZ-004 | Tastiera numerica ore/km | `inputMode="numeric"` |
| MZ-011 | Touch target filtri | `min-h-11` su input e GlobalSelect filtro |
| Drawer | Filtri su mobile | `PageToolbar` → `MobileFilterDrawer` keyboard-aware |
| Form | 10+ combobox modale | `GestionaleModalScrollBody` + portal globale |

### Matrice test (code review)

| Viewport | Esito atteso |
|----------|--------------|
| Desktop ≥1280px | Filtri 6 colonne, modale form a sezioni Cliente/Attrezzatura/Telaio |
| Tablet 768px | Filtri collapse inline, griglia form 2 col |
| Mobile 390×844 | Drawer filtri + 1 portal `GlobalSelect`; modale scroll; hierarchy typeahead ancorati |

**Casi critici verificati (statico):** search client-side, 5 filtri testo + tastiera, ultima lavorazione in drawer, modale 14 campi, upload hub.

---

## 5. Correzioni applicate

| ID | File | Intervento |
|----|------|------------|
| MZ-001 | `mezzi-filters.tsx` | `MezziFieldWrap` con `htmlFor`; `id` su 5 input testo filtro |
| MZ-002 | idem | `<select>` → `GlobalSelect` `id="mezzi-filter-ultima-lav"` selectOnly |
| MZ-003 | `mezzi-view.tsx` | `htmlFor` + `id` su matricola, scuderia, targa, ore, km |
| MZ-004 | idem | `inputMode="numeric"` su ore lavoro e KM |
| MZ-005 | idem | `id` + `htmlFor` su 5× `GlobalSettingsListSelect` form |
| MZ-011 | `mezzi-filters.tsx` | `filterTextInputClass`: `min-h-10` → `min-h-11` (anche GlobalSelect filtro) |
| MZ-012 | idem | `id="mezzi-search"` su `GestionaleSearchField` |

---

## 6. Verifica finale

- [x] Inventario perimetro pagina + modali + hub Foto
- [x] Nessun `type="date"`, `<select>`, `<datalist>` in tree mezzi
- [x] Filtri: `htmlFor`, `GlobalSelect` ultima lavorazione, `min-h-11`
- [x] Search: `id="mezzi-search"` + `aria-label`
- [x] Form: `GestionaleModalScrollBody`, label associate su plain input e list select
- [x] Regressione statica: `lib/regression/mezzi-inputs-audit.test.ts` (OK)
- [ ] QA manuale device iPhone/Android — raccomandato post-deploy (drawer filtri + dropdown modale)

---

## 7. Classificazione residui

| ID | Severità | Nota |
|----|----------|------|
| MZ-006 | Basso | Search: `aria-label` + `id` — sufficiente |
| MZ-007 | Info | Anno non editabile in UI |
| MZ-008 | Info | Hierarchy combobox mitigati da `aria-label` — no estensione API |
| MZ-009 | Info | Upload hub via componente condiviso già accessibile |
| MZ-010 | Basso | Filtri client-side senza debounce — intenzionale |

**Critico / Alto / Medio residui:** nessuno dopo fix MZ-001…MZ-005, MZ-011, MZ-012.
