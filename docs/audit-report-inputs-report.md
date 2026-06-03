# Audit campi input — REPORT

**Data:** 2026-06-03  
**Perimetro:** `/report` → toolbar periodo + sezioni con filtri/modali input  
**Escluso:** grafici, tabelle read-only, KPI, export PDF, navigazione zone  
**Tipo:** UX / layout / responsive / accessibilità / ancoraggio dropdown — **nessuna modifica business/API**

---

## 1. Elenco campi analizzati

### Toolbar periodo — `report-controls.tsx`

| Campo | Tipo | Scopo | Stato |
|-------|------|-------|-------|
| Oggi / Ultimi 30 giorni / Ultimi 3 mesi / Mese corrente | button (segmented) | Preset periodo rapido | enabled |
| Confronto | `GlobalSelect` | Confronto periodi | enabled |
| Altro periodo | `GlobalSelect` | Preset aggiuntivi | enabled |
| Da / A | `GlobalDatePickerYmd` | Intervallo personalizzato | enabled (solo preset `custom`) |

### Analisi lavorazioni temporali — `report-lavorazioni-temporal-section.tsx`

| Campo | Tipo | Scopo | Stato |
|-------|------|-------|-------|
| Anno | `GlobalSelect` | Filtra anno tabella/KPI | enabled |

### Ricambi a maggior consumo — `report-ricambi-consumo-section.tsx`

| Campo | Tipo | Scopo | Stato |
|-------|------|-------|-------|
| Intero periodo / Per mese / Per anno | button (segmented) | Modalità aggregazione | enabled |
| Mese (nel periodo) | `GlobalSelect` | Sotto-filtro mese | enabled / disabled se nessun mese |
| Anno (nel periodo) | `GlobalSelect` | Sotto-filtro anno | enabled / disabled se nessun anno |

### Lavorazioni — modale «Dati storici manuali» — `report-lavorazioni-section.tsx`

| Campo | Tipo | Scopo | Stato |
|-------|------|-------|-------|
| Periodo | `GlobalSelect` | Mese storico | enabled |
| Lavorazioni completate | input number | Conteggio | enabled |
| Note (opzionale) | input text | Annotazione | enabled |

### Magazzino — modale «Storico manuale magazzino» — `report-magazzino-section.tsx`

| Campo | Tipo | Scopo | Stato |
|-------|------|-------|-------|
| Mese (YYYY-MM) | `GlobalSelect` | Mese da sovrascrivere | enabled |
| Entrate, Uscite, Δ Quantità, Δ Capitale, Capitale finale | input text | Valori numerici opzionali | enabled |

**Pattern positivi post-fix:** nessun `<select>`, `type="date"`, `<datalist>`; dropdown via portal ERP; modali con scroll keyboard-aware.

---

## 2. Problemi trovati (pre-fix)

| ID | Severità | Area | Problema |
|----|----------|------|----------|
| RP-001 | **Medio** | Toolbar | Confronto / Altro periodo / date custom senza `htmlFor`↔`id` |
| RP-002 | **Medio** | 4 sezioni | `<select>` nativo OS (dropdown non ancorato portal) |
| RP-003 | **Medio** | Modali manuali | Campi senza `htmlFor`/`id` |
| RP-004 | **Medio** | Modali manuali | Numerici senza `inputMode` mobile |
| RP-005 | **Medio** | Modali manuali | Scroll custom, no `GestionaleModalScrollBody` |
| RP-006 | **Basso** | Segmented | Preset periodo e aggregazione ricambi senza `aria-pressed` |
| RP-007 | **Basso** | Modale lavorazioni | Errore form senza `role="alert"` |
| RP-008 | **Info** | Perimetro | Nessun campo ricerca testuale — filtri solo periodo/aggregazione |

**Critico:** nessuno.

---

## 3. Incoerenze e duplicazioni

- Toolbar usa già `GlobalSelect`/`GlobalDatePickerYmd`; sezioni interne usavano `<select>` nativo — **allineato post-fix**.
- Etichette date toolbar «Da»/«A» coerenti con altre pagine gestionale.
- Modali storico lavorazioni vs magazzino: stesso pattern modale + portal select post-fix.
- Nessuna duplicazione funzionale dei campi.

---

## 4. Problemi mobile / tastiera / dropdown

| ID | Verifica | Esito post-fix |
|----|----------|----------------|
| RP-002 | Dropdown nativo iOS/Android fullscreen | `GlobalSelect` portal ancorato |
| RP-005 | Tastiera copre campi modale | `GestionaleModalScrollBody` + footer fisso |
| RP-004 | Tastiera numerica | `inputMode="numeric"` / `"decimal"` |
| RP-001 | Screen reader toolbar | `htmlFor` + label visibile «Confronto» |

### Matrice test (code review)

| Viewport | Esito atteso |
|----------|--------------|
| Desktop ≥1280px | Toolbar 2 righe, select affiancati, modali centrate |
| Tablet 768px | Toolbar wrap, filtri ricambi stack |
| Mobile 390×844 | Segmented full-width; modali scroll; dropdown portal sotto campo |

---

## 5. Correzioni applicate

| ID | File | Intervento |
|----|------|------------|
| RP-001 | `report-controls.tsx` | `htmlFor` su confronto, altro periodo, date; `id="report-period-da/a"` |
| RP-002 | `report-lavorazioni-temporal-section.tsx` | `GlobalSelect` anno |
| RP-002 | `report-ricambi-consumo-section.tsx` | `GlobalSelect` mese/anno |
| RP-002/003/004/005/007 | `report-lavorazioni-section.tsx` | `GlobalSelect` periodo; `htmlFor`/`id`; `inputMode="numeric"`; `GestionaleModalScrollBody`; `role="alert"` |
| RP-002/003/004/005 | `report-magazzino-section.tsx` | `GlobalSelect` mese; `htmlFor`/`id`; `inputMode="decimal"`; `GestionaleModalScrollBody` |
| RP-006 | `report-controls.tsx`, `report-ricambi-consumo-section.tsx` | `aria-pressed` su segmented |

---

## 6. Verifica finale

- [x] Inventario perimetro toolbar + 4 superfici input
- [x] Nessun `type="date"`, `<select>`, `<datalist>` in `components/report`
- [x] Toolbar: `htmlFor`, `GlobalDatePickerYmd`, label «Confronto»
- [x] Modali: scroll keyboard-aware, errori accessibili
- [x] Regression: `npx tsx lib/regression/report-inputs-audit.test.ts`

### Riepilogo severità post-fix

| Severità | Pre-fix | Post-fix |
|----------|---------|----------|
| Critico | 0 | 0 |
| Alto | 0 | 0 |
| Medio | 5 | 0 (corretti) |
| Basso | 2 | 0 (corretti) |
| Info | 1 | 1 (nessuna azione) |
