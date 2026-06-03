# Audit campi input — CONFIGURAZIONE

**Data:** 2026-06-03  
**Perimetro:** `/impostazioni` → [`sistema-impostazioni-modal.tsx`](components/dashboard/sistema-impostazioni-modal.tsx) (`SistemaImpostazioniPageView`)  
**Escluso:** dialoghi conferma, migrazione preventivi (solo bottoni), export  
**Tipo:** UX / layout / responsive / accessibilità — **nessuna modifica business/API**

---

## 1. Elenco campi analizzati

### Toolbar / navigazione

| Campo | Tipo | Stato |
|-------|------|-------|
| Cerca sezioni (×3) | `GestionaleSearchField` | enabled |
| Section picker mobile | custom listbox | enabled |
| Nav sezioni (×17) | button | enabled |

### Operatività (embedded `SettingsLavorazioniModal`)

| Sezione | Campi | Tipo |
|---------|-------|------|
| Addetti | Nome, Cognome, Colore | text, color popover |
| Stati | Nuovo stato, Nome riga, Colore, Stato finale | text, checkbox, color |
| Priorità | Attiva, Colore | checkbox, color |
| Tipi assenza | Sigla, Nome, Altro, Nuovo tipo | text, checkbox |

### Liste (magazzino, clienti, attrezzatura, telaio)

| Componente | Campi |
|------------|-------|
| `UnifiedStringList` (×6) | search, add, rename inline |
| `ClientiCommercialiList` | search, add, rename, sconto % |
| `MagazzinoMarcheList` | search, add, rename, sconto listino % |
| `HierarchyTreeSettingsSection` | search, marca/modello add/rename |

### Sistema

| Campo | Tipo |
|-------|------|
| Costo manodopera default (€/h) | number |

**Pattern positivi:** nessun `<select>`, `type="date"`, `<datalist>`; color picker via portal; filtri search con `aria-label`.

---

## 2. Problemi trovati (pre-fix)

| ID | Severità | Problema |
|----|----------|----------|
| CFG-001 | **Alto** | ~8 campi «Aggiungi» senza `aria-label` |
| CFG-002 | **Medio** | Sconti %: label non associata; no `inputMode` |
| CFG-003 | **Medio** | Costo orario: no `htmlFor`/`id`; no `inputMode` |
| CFG-004 | **Medio** | Checkbox stati/priorità senza `aria-label`/`htmlFor` |
| CFG-005 | **Medio** | Touch target sotto 44px (add `min-h-9`, discount `min-h-8`) |
| CFG-006 | **Basso** | Nav senza `aria-current` |
| CFG-007 | **Basso** | Nome stato: `aria-label` generico |
| CFG-008 | **Basso** | Color input senza `aria-label` |
| CFG-009 | **Basso** | Modal: scroll raw vs `GestionaleModalScrollBody` |
| CFG-010 | **Basso** | CTA «Aggiungi modello» `min-h-7` |
| CFG-011 | **Info** | Filtri client-side senza debounce — intenzionale |

**Critico / Alto:** CFG-001 only.

---

## 3. Incoerenze e duplicazioni

- Add fields: lavorazioni/gerarchie etichettati; liste stringhe no — **allineato post-fix** (`addAriaLabel` / placeholder fallback).
- Sconti clienti vs marche: stesso pattern visivo — **allineato** con `htmlFor`/`id` + `inputMode`.
- Nessuna duplicazione funzionale campi.

---

## 4. Problemi mobile / tastiera / dropdown

| ID | Verifica | Esito post-fix |
|----|----------|----------------|
| CFG-001 | SR su campi add | `aria-label` su tutti gli add |
| CFG-005 | Tap sconti/add | `min-h-10` su add e discount |
| CFG-009 | Tastiera modale | `GestionaleModalScrollBody` via `SettingsMainPanel` |
| — | Section picker | Panel `absolute top-full` — ancorato, OK |
| — | Color popover | Portal ERP — ancorato al swatch |

### Matrice test (code review)

| Viewport | Esito atteso |
|----------|--------------|
| Desktop ≥1280px | Nav aside + pannello sezione |
| Tablet 768px | Section picker mobile |
| Mobile 390×844 | Picker ancorato; add full-width; scroll modale keyboard-aware |

---

## 5. Correzioni applicate

| ID | File | Intervento |
|----|------|------------|
| CFG-001 | `sistema-impostazioni-modal.tsx` | `addAriaLabel` su `UnifiedStringList`; `aria-label` clienti/marche add |
| CFG-002 | idem + `settings-list-ui.tsx` | `htmlFor`/`id` sconti; `inputMode="decimal"`; discount `min-h-10` |
| CFG-003 | `sistema-impostazioni-modal.tsx` | `config-costo-orario-default` + `htmlFor` + `inputMode` |
| CFG-004 | `lavorazioni-settings-ui.tsx`, `lavorazioni-modals.tsx` | Checkbox con `htmlFor`/`id` + `aria-label` |
| CFG-005 | `sistema-impostazioni-modal.tsx`, `settings-dipendenti-assenze-section.tsx` | `SETTINGS_ADD_INPUT` `min-h-10`; assenze add `min-h-10` |
| CFG-006 | `sistema-impostazioni-modal.tsx` | `aria-current` nav desktop + mobile |
| CFG-007 | `lavorazioni-settings-ui.tsx` | `aria-label` per-item nome stato |
| CFG-008 | `settings-color-picker-popover.tsx` | `aria-label` su `type="color"` |
| CFG-009 | `sistema-impostazioni-modal.tsx` | `SettingsMainPanel` → `GestionaleModalScrollBody` in modal |
| CFG-010 | `hierarchy-tree-settings-section.tsx` | CTA modello `min-h-10` |
| — | `settings-dipendenti-assenze-section.tsx` | Sigla: `inputMode="text"`, `autoCapitalize="characters"` |

---

## 6. Verifica finale

- [x] Inventario 17 sezioni
- [x] Nessun `type="date"`, `<select>`, `<datalist>` nel perimetro
- [x] Add/search/number/checkbox/color mappati e corretti
- [x] Regression: `npx tsx lib/regression/configurazione-inputs-audit.test.ts`

### Riepilogo severità post-fix

| Severità | Pre-fix | Post-fix |
|----------|---------|----------|
| Critico | 0 | 0 |
| Alto | 1 | 0 |
| Medio | 4 | 0 |
| Basso | 5 | 0 |
| Info | 1 | 1 |
