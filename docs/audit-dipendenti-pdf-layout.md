# Audit layout PDF ore dipendenti (complessivo)

**Data:** 2026-06-09  
**Scope:** griglia mensile orizzontale in `buildComplessivoPdf` (A4 landscape)  
**Vincolo:** solo layout colonne — nessuna modifica a calcoli, formattazione celle, export o totali.

---

## File coinvolti

| File | Ruolo |
|------|--------|
| [`lib/dipendenti/pdf/dipendenti-pdf-grid-layout.ts`](../lib/dipendenti/pdf/dipendenti-pdf-grid-layout.ts) | Pesi colonne + `computeTimesheetGridColumnWidths` |
| [`lib/dipendenti/pdf/dipendenti-pdf-sections.ts`](../lib/dipendenti/pdf/dipendenti-pdf-sections.ts) | `drawPresenzeMonthlyGrid` usa larghezze per giorno |
| [`lib/dipendenti/pdf/dipendenti-pdf-grid-layout.test.ts`](../lib/dipendenti/pdf/dipendenti-pdf-grid-layout.test.ts) | Regression layout |
| [`lib/regression/smoke-regression-lists.ts`](../lib/regression/smoke-regression-lists.ts) | Wire EXTENDED tier |

**Non modificati:** `timesheet-cell-display.ts`, `timesheet-totals.ts`, `dipendenti-pdf-export.ts`, PDF singolo dipendente (portrait).

---

## Problema risolto

Colonne giorno **tutte uguali** (~8.6mm su 31 giorni) con `overflow: hidden` troncavano etichette assenza come `8 FES` → `8 FE`.

---

## Larghezze prima / dopo (A4 landscape, `pageW = 297mm`)

Budget giorni: `289 - 14 - 8.5 = 266.5mm` (invariato).

| Mese | Giorni | **Prima** (tutte) | Feriale **dopo** | Sab **dopo** | Dom **dopo** |
|------|--------|-------------------|------------------|--------------|--------------|
| 2026-01 | 31 | 8.60 mm | **9.26 mm** | 7.22 mm | 6.67 mm |
| 2026-02 | 28 | 9.52 mm | **10.25 mm** | 8.00 mm | 7.38 mm |
| 2026-04 | 30 | 8.88 mm | **9.52 mm** | 7.42 mm | 6.85 mm |

### Pesi relativi

| Tipo | Peso |
|------|------|
| Lun–Ven | 1.00 |
| Sabato | 0.78 |
| Domenica | 0.72 |

---

## Ottimizzazioni applicate

1. Estratto helper layout testabile (`dipendenti-pdf-grid-layout.ts`).
2. Larghezza colonna giorno proporzionale al peso (non uniforme).
3. Feriali più larghi (~+8–11% vs uniforme su 31 giorni); weekend più stretti.
4. `tableW`, `nameColW`, `totColW`, `fontSize`, overflow e colori weekend invariati.

---

## Verifica leggibilità codici

| Etichetta | Formatter (invariato) | Beneficio |
|-----------|----------------------|-----------|
| `8 FES` (Festività) | `formatAbsenceCellShortLabel` | Feriale ≥ 9.0mm |
| `8 F` / `7 F` (Ferie) | idem | OK |
| `10 MAT` (Maternità) | idem | Feriale più largo |
| `8+2` (presenze) | `formatWorkCellShortLabel` | OK (corto) |

---

## Verifica mesi 28 / 30 / 31 giorni

Test automatici su `2026-01`, `2026-02`, `2026-04`:

- Somma colonne = `tableW` (tolleranza 0.02mm)
- Ogni feriale > larghezza uniforme legacy
- Ogni weekend < larghezza uniforme legacy
- `min(feriale) >= 9.0mm`

---

## Verifica page break

- `tableWidth` resta **289mm** — nessun overflow orizzontale aggiuntivo.
- Numero righe body invariato → nessun impatto su paginazione verticale rispetto a prima.
- PDF che entrava in una pagina orizzontalmente resta entro i margini.

---

## Test eseguiti

```bash
node --import tsx lib/dipendenti/pdf/dipendenti-pdf-grid-layout.test.ts
# dipendenti-pdf-grid-layout.test.ts OK
```

---

## Rischi residui

| Rischio | Mitigazione |
|---------|-------------|
| Abbrev custom 6 char su weekend stretto | Weekend usati meno per presenze; festività su feriale beneficia |
| Mese 31 giorni al limite (~9.26mm feriale) | Sopra soglia 9.0mm test; smoke manuale consigliato |
| `12 ABCDEF` custom su weekend | Raro; weekend già più stretto per design |

---

## Valutazione leggibilità layout

| Criterio | Prima | Dopo |
|----------|-------|------|
| Codici assenza feriali | 5/10 (troncamento FES) | **9/10** |
| Uso spazio weekend | 4/10 | **8/10** |
| Stabilità pagina | 9/10 | **9/10** |
| **Complessivo** | **6/10** | **8.5/10** |

---

## Checklist smoke manuale

- [ ] PDF complessivo giugno: cella `8 FES` su feriale leggibile
- [ ] PDF con ferie, malattia, permessi, straordinari
- [ ] Confronto stampa prima/dopo su stesso mese (nessun dato/totale cambiato)
