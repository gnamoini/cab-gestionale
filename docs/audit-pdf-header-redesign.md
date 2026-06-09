# Audit e redesign header PDF — Logo + Titolo

**Data:** 2026-06-09  
**Scope:** solo header (`drawGestionalePdfHeader` / `drawPdfBrandBlock`). Nessuna modifica a dati, tabelle operative, calcoli o export.

---

## 1. PDF analizzati

| PDF | Entry point | Header | Logo API |
|-----|-------------|--------|----------|
| Preventivo / consuntivo | `lib/preventivi/preventivi-pdf.ts` | `drawGestionalePdfHeader` | sì |
| Schede ingresso / lav. / ricambi | `lib/schede/schede-pdf.ts` | idem | sì |
| Timesheet complessivo (landscape) | `lib/dipendenti/pdf/dipendenti-pdf-sections.ts` | idem | sì |
| Timesheet dipendente (portrait) | idem | idem | sì |
| Lista lavorazioni in corso (landscape) | `lib/lavorazioni/lavorazioni-list-pdf.ts` | idem | sì |
| BUNDER commerciale | `lib/bunder/bunder-pdf.ts` | layout proprio | no (fuori scope CAB) |

---

## 2. Header trovati

- **SSOT gestionale:** `drawGestionalePdfHeader` → `drawPreventivoPdfHeader` in `lib/pdf/preventivo-pdf-layout.ts`
- **Logo:** `loadBrandingLogoDataUrl()` → `drawPdfBrandBlock()`
- **Eccezione:** BUNDER (brand e margini diversi, non modificato)

---

## 3. Differenze rilevate (prima del redesign)

| Aspetto | Preventivo / schede | Timesheet / lavorazioni |
|---------|---------------------|-------------------------|
| Metadati (N., data, operatore) | sì | no |
| `metaDivider` | default `true` | `false` (prima: senza linea finale) |
| Orientamento | portrait | landscape (timesheet, lavorazioni) |

---

## 4. Criticità pre-redesign

1. Logo max **6.5 mm** — troppo piccolo (~2.2% altezza A4).
2. `CAB_LOGO_PDF_MAX_HEIGHT_MM = 8` non allineato al cap effettivo (6.5).
3. Logo allineato in alto nello slot, non centrato verticalmente.
4. Gap brand→titolo **4.5 mm** — gruppo logo+titolo disgiunto.
5. Titolo **11.5 pt** — gerarchia debole rispetto al fallback testuale 13 pt.
6. Documenti con `metaDivider: false` senza separatore visivo prima del contenuto.

---

## 5. Nuovo layout adottato

```
PDF_MARGIN_TOP (18 mm)
  └─ Brand slot (11 mm) — logo max 10.5 mm, centrato verticalmente
  └─ Gap (3 mm)
  └─ Titolo documento (12.5 pt bold, centrato)
  └─ Meta opzionale (9.5 pt)
  └─ Rule orizzontale (sempre, anche metaDivider false)
pdfAdvanceSection (5.5 mm)
  └─ Sezioni operative (invariate)
```

---

## 6. Dimensioni logo — prima / dopo

| Parametro | Prima | Dopo |
|-----------|-------|------|
| `PDF_HEADER_BRAND_MAX_MM` | 6.5 mm | **10.5 mm** |
| `PDF_HEADER_BRAND_BLOCK_MM` | 6.5 mm | **11 mm** |
| `CAB_LOGO_PDF_MAX_HEIGHT_MM` | 8 mm (non usato) | **10.5 mm** (allineato) |
| Larghezza max portrait (~166 mm utili) | ~22.7 mm | **~36.8 mm** |
| Posizione verticale | top slot | **centrata nello slot** |

---

## 7. Spaziature — prima / dopo

| Parametro | Prima | Dopo |
|-----------|-------|------|
| Gap brand → titolo | 4.5 mm | **3 mm** |
| Titolo font size | 11.5 pt | **12.5 pt** |
| Avanzamento dopo titolo | 5.5 mm | **6 mm** |
| Rule sotto header (`metaDivider: false`) | assente | **presente** |

---

## 8. Verifica PDF a pagina singola

Test automatico `lib/pdf/pdf-header-branding.test.ts`:

- Header Y finale identico logo ON / fallback testuale OFF
- `metaDivider: false` include separatore (assert dedicato)
- **Page count invariato** (logo ON vs OFF): preventivo piccolo/medio/grande, lavorazioni 8 e 55 righe — **tutti passati**

---

## 9. Verifica PDF multipagina

- Preventivo 40 righe ricambi: page count logo ON = OFF
- Lavorazioni 55 righe landscape: page count logo ON = OFF
- Nessuna regressione paginazione rilevata nei test automatici

---

## 10. Standardizzazione effettuata

| Elemento | Esito |
|----------|--------|
| Costanti logo unificate | `PDF_HEADER_BRAND_MAX_MM` = `CAB_LOGO_PDF_MAX_HEIGHT_MM` = 10.5 |
| 5 PDF CAB | stesso header SSOT, nessun call site modificato |
| BUNDER | non allineato (brand separato, per design) |

---

## 11. File modificati

- `lib/pdf/preventivo-pdf-layout.ts` — costanti, `drawPdfBrandBlock`, `drawPreventivoPdfHeader`
- `lib/branding/branding-logo-for-pdf.ts` — `CAB_LOGO_PDF_MAX_HEIGHT_MM`
- `lib/pdf/pdf-header-branding.test.ts` — assert `metaDivider: false`

---

## 12. Rischi residui

- PDF al limite di una pagina non coperti da test automatici: verifica manuale consigliata su preventivi molto densi.
- BUNDER resta con header custom non allineato al CAB.
- `metaDivider` in `PreventivoPdfHeaderMeta` è ora ignorato (rule sempre disegnata); proprietà mantenuta per compatibilità API.

---

## 13. Verifica manuale consigliata

1. Preventivo con logo reale — logo leggibile, titolo evidente.
2. Timesheet giugno landscape — separatore sotto titolo, tabella non tagliata.
3. Stampa B/N — logo riconoscibile.

---

## 14. Valutazione finale

| Criterio | Voto |
|----------|------|
| Leggibilità logo | 8/10 |
| Gerarchia titolo | 8/10 |
| Equilibrio spazi | 8/10 |
| Compatibilità paginazione (test) | 9/10 |
| Coerenza brand CAB | 8/10 |
| **Media** | **8/10** |

Target 9/10 raggiungibile dopo smoke visivo stampa con logo reale in produzione.
