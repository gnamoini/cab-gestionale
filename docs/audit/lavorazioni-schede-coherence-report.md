# Audit coerenza Lavorazioni ↔ Scheda di Ingresso ↔ Ricambi

**Data:** 2026-09-01  
**Stato:** Remediation implementata

---

## Root cause — caso Doppstadt

Per lavorazioni con **Scheda di Ingresso presente** e `marcaAttrezzatura = ""`, la tabella Lavorazioni mostrava "Doppstadt" tramite fallback silenzioso a `attrezzature.marca` (`resolveAttrezzaturaLine`, `targetSnapshotFromInputs` con priorità DB-first). La Scheda editor leggeva correttamente lo snapshot JSONB vuoto.

**Caso B** (scheda presente + campo vuoto) era trattato come se il catalogo potesse riempire il gap in lista — semanticamente errato.

---

## Architecture

```text
Catalogo (mezzi/attrezzature)
   ↓ bootstrap esplicito (solo scheda assente) / edit_hydrate (solo editor)
Scheda di Ingresso (snapshot SSOT per lavorazioni con scheda)
   ↓ resolveInterventoCanonical("ui")
Canonical Intervention Resolver (regola A/B/C)
   ↓
Table / Detail / Filters / Export / Ricambi derivati
```

### Regola A/B/C

| Stato | Read |
|-------|------|
| **A** Scheda presente + campo valorizzato | Solo valore scheda |
| **B** Scheda presente + campo vuoto | `""` ovunque — nessun fallback catalogo |
| **C** Scheda assente | Bootstrap documentato: lavorazione legacy → catalogo |

---

## Coherence matrix (post-fix)

| Campo | SSOT | Tabella | Scheda | Dettaglio | Filtri | Export | Ricambi | Stato |
|-------|------|---------|--------|-----------|--------|--------|---------|-------|
| marcaAttrezzatura | scheda.campi | canonical | JSONB / hydrate editor | canonical | canonical | canonical | N/A | **OK** |
| modelloAttrezzatura | scheda.campi | canonical | idem | canonical | canonical | canonical | N/A | **OK** |
| tipoAttrezzatura | scheda.campi | canonical | idem | canonical | N/A | canonical | N/A | **OK** |
| marcaTelaio / modelloTelaio | scheda.campi | canonical | idem | canonical | canonical | canonical | N/A | **OK** |
| matricola | scheda.campi | canonical | idem | canonical | canonical | canonical | N/A | **OK** |
| cliente / utilizzatore / cantiere | scheda.campi | canonical | idem | canonical | canonical | canonical | N/A | **OK** |
| targa / nScuderia | scheda.campi | canonical | idem | canonical | canonical | canonical | N/A | **OK** |
| identificazioneMacchina | derivato canonical | N/A | legacy persist | canonical hub | N/A | PDF legacy field | canonical read | **DERIVED-INTENTIONAL** |
| note | lavorazioni.note | colonna | form | hub | N/A | PDF | N/A | **OK** |
| actual_labor_hours | scheda interventi | somma scheda | N/A | hub | N/A | N/A | N/A | **DERIVED-INTENTIONAL** |
| matricola backfill storico | — | — | — | — | — | — | — | **REQUIRES_REVIEW** (no auto backfill) |

---

## Changes

### Core resolver

- [`lib/domain/intervento-context/scheda-ingresso-read-policy.ts`](lib/domain/intervento-context/scheda-ingresso-read-policy.ts) — regola A/B/C
- [`lib/domain/intervento-context/resolve-ingresso-field-display.ts`](lib/domain/intervento-context/resolve-ingresso-field-display.ts) — SSOT read per campo
- [`lib/domain/intervento-context/resolve-intervento-display.ts`](lib/domain/intervento-context/resolve-intervento-display.ts) — campi flat + canonical
- [`lib/domain/intervento-context/build-intervento-context.ts`](lib/domain/intervento-context/build-intervento-context.ts) — `catalog` snapshot, target structural-only
- [`lib/domain/mezzo-attrezzatura/intervento-oggetto-display.ts`](lib/domain/mezzo-attrezzatura/intervento-oggetto-display.ts)

### Consumer allineati

- [`lib/lavorazioni/resolve-lavorazione-context-with-attrezzatura.ts`](lib/lavorazioni/resolve-lavorazione-context-with-attrezzatura.ts)
- [`lib/lavorazioni/lavorazioni-list-row-labels.ts`](lib/lavorazioni/lavorazioni-list-row-labels.ts)
- [`lib/lavorazioni/lavorazioni-advanced-filters.ts`](lib/lavorazioni/lavorazioni-advanced-filters.ts)
- [`components/lavorazioni/schede/schede-lavorazione-modal.tsx`](components/lavorazioni/schede/schede-lavorazione-modal.tsx) — `edit_hydrate`, `hubIdentParts`
- [`lib/mezzi/identificazione-mezzo.ts`](lib/mezzi/identificazione-mezzo.ts) — `identificazionePartsFromInterventoDisplay`
- [`lib/schede/resolve-identificazione-macchina.ts`](lib/schede/resolve-identificazione-macchina.ts)

### Data / audit

- [`scripts/audit-scheda-ingresso-coherence.sql`](scripts/audit-scheda-ingresso-coherence.sql)
- [`supabase/migrations/20260901150000_scheda_ingresso_backfill_marca_modello.sql`](supabase/migrations/20260901150000_scheda_ingresso_backfill_marca_modello.sql) — marca/modello only

### Tests

- [`lib/regression/lavorazioni-schede-coherence.test.ts`](lib/regression/lavorazioni-schede-coherence.test.ts)
- [`lib/domain/mezzo-attrezzatura/intervento-oggetto-display.test.ts`](lib/domain/mezzo-attrezzatura/intervento-oggetto-display.test.ts)
- [`lib/schede/merge-scheda-ingresso-with-mezzo-priority.test.ts`](lib/schede/merge-scheda-ingresso-with-mezzo-priority.test.ts)
- [`e2e/smoke/13-lavorazioni-scheda-ingresso.spec.ts`](e2e/smoke/13-lavorazioni-scheda-ingresso.spec.ts)
- [`lib/regression/smoke-regression-lists.ts`](lib/regression/smoke-regression-lists.ts)

---

## Data remediation

1. Eseguire [`scripts/audit-scheda-ingresso-coherence.sql`](scripts/audit-scheda-ingresso-coherence.sql) **pre-count**
2. Applicare migration backfill marca/modello
3. Ripetere audit **post-count**

**Matricola:** solo classificazione in audit SQL — nessun backfill automatico (semantica intervento vs catalogo).

---

## Tests

```text
npx tsx lib/regression/lavorazioni-schede-coherence.test.ts
npx tsx lib/domain/intervento-context/resolve-intervento-display.test.ts
npx tsx lib/domain/mezzo-attrezzatura/intervento-oggetto-display.test.ts
npx tsx lib/regression/intervento-export-ui-alignment.test.ts
npx tsx lib/schede/merge-scheda-ingresso-with-mezzo-priority.test.ts
```

---

## Residual risks

1. **Scheda assente (C)** vs **scheda presente+campo vuoto (B)** — devono restare distinti in ogni nuovo consumer; usare `resolveIngressoFieldDisplay`, non `??` manuali.
2. **Cache localStorage** — `preferRicherSchedeBundle` può preferire bundle locale; display lista usa `schedeStore` RQ — monitorare con test badge/cache esistenti.
3. **Matricola storica** — possibili divergenze scheda/catalogo documentate come `REQUIRES_REVIEW`.
4. **Campo persistito `identificazioneMacchina`** — legacy in DB/PDF; read ufficiale da canonical.

---

## Criterio di completamento

Per lavorazioni **con Scheda di Ingresso**: `SSOT scheda = canonical = tabella = dettaglio = filtri = export`.

Caso **Doppstadt** (catalogo valorizzato, scheda vuota): UI lavorazione mostra vuoto; hydration editor esplicita (`edit_hydrate`) precompila senza persist fino al save.
