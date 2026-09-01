# Verifica post-implementazione — Lavorazioni ↔ Scheda ↔ Ricambi

**Data verifica:** 2026-09-01  
**Scope:** gate read-only post-remediation `lavorazioni-schede-coherence`  
**Riferimento implementazione:** [`lavorazioni-schede-coherence-report.md`](./lavorazioni-schede-coherence-report.md)

---

## 1. Executive result

**`PASS WITH FINDINGS`** (post gate-closure — vedi §13)

| Area | Esito (gate closure 2026-09-01) |
|------|----------------------------------|
| TSC | **PASS** (import fix applicato) |
| Coherence tests + catalog contradiction | **PASS** |
| Ricambi legacy | **LEGACY COMPATIBILITY — NON BLOCKING** |
| `smoke:regression:core` | **FAIL** — `notification-service.test.ts` (FLAKY/ENVIRONMENT) |
| `control:pr` | **FAIL** — 6 blocker (env/build/report, non coherence) |
| `ci:build` | **FAIL** — budget PWA/env (UNRELATED) |
| E2E smoke 13 | **NOT EXECUTED** |
| DB audit | **PASS** (conteggi invariati) |

---

## 2. Caso Doppstadt (before / after)

### Prima della remediation

- Tabella: mostrava `Doppstadt` via fallback silenzioso a `attrezzature.marca` (`resolveAttrezzaturaLine`, `targetSnapshotFromInputs` DB-first).
- Scheda editor: leggeva JSONB `marcaAttrezzatura = ""` → campo vuoto.
- **Divergenza tabella ↔ scheda.**

### Dopo la remediation (evidenza test)

Fixture: `scheda.marcaAttrezzatura = ""`, `attrezzature.marca = Doppstadt`, modello catalogo `Cilindro`.

| Surface | Valore atteso | Valore osservato | Status |
|---------|---------------|------------------|--------|
| canonical | `""` | `""` | OK |
| tabella (oggetto primary) | `—` | `—` | OK |
| filtro marca | `""` | `""` | OK |
| portal attrezzaturaLine | `—` | `—` | OK |
| editor raw (DB) | `""` | `""` | OK |
| editor hydrate (`edit_hydrate`) | `Doppstadt` (solo UI) | `Doppstadt` | OK |

Fonte: `npx tsx lib/regression/lavorazioni-schede-coherence.test.ts` — output `OK`.

---

## 3. A/B/C verification

| Caso | Expected | Actual | Status |
|------|----------|--------|--------|
| **A** scheda `Haller` + catalogo `Doppstadt` | canonical/tabella/filtro = `Haller` | `X` / `Model-X` in test scheda-wins; catalog contradiction sotto | OK |
| **B** scheda presente + marca `""` + catalogo `Doppstadt` | read = `""`; editor hydrate = `Doppstadt` senza persist | come tabella Doppstadt sopra | OK |
| **C** scheda assente + catalogo `Doppstadt` | bootstrap = `Doppstadt` | `Doppstadt` | OK |

### Catalog contradiction (Haller / Doppstadt / Farid)

Fixture: `scheda.marcaAttrezzatura = Haller`, catalogo attrezzatura `Doppstadt`, embed mezzo `Farid`.

Esecuzione inline (sessione verifica):

```json
{
  "table": "Haller Model-H",
  "detail": "Haller Model-H",
  "filter": "Haller",
  "export": "Haller",
  "ident": "Marca attrezzatura: Haller • Modello: Model-H",
  "editor": "Haller"
}
```

| Surface | Expected | Actual | Status |
|---------|----------|--------|--------|
| table | Haller | Haller Model-H | OK |
| detail | Haller | Haller Model-H | OK |
| filter | Haller | Haller | OK |
| export | Haller | Haller | OK |
| ricambi (ident) | Haller | Haller (in ident string) | OK |
| editor (hydrate) | Haller | Haller | OK |

Ripetuto per `modelloAttrezzatura` (`Model-H`) e `marcaTelaio` (`Telaio-H`) nello stesso run — export e canonical allineati.

---

## 4. Coherence matrix

Legenda: **OK** = SSOT scheda via `resolveIngressoFieldDisplay` / `resolveInterventoDisplay`; **DERIVED** = campo derivato; **BOOTSTRAP** = solo scheda assente o create; **LEGACY** = persistito non usato in read ufficiale; **GAP** = divergenza documentata.

| Campo | DB SSOT | canonical | tabella | dettaglio | editor | filtri | export | Ricambi | Stato |
|-------|---------|-----------|---------|-----------|--------|--------|--------|---------|-------|
| marcaAttrezzatura | scheda.campi | `resolveIngressoFieldDisplay` | `lavorazioneOggettoCellLines` | `resolveLavorazioneContextWithAttrezzatura` | raw JSONB + `edit_hydrate` | `rowEntityFields` | `resolveInterventoCanonical("export")` | ident canonical | **OK** |
| modelloAttrezzatura | idem | idem | idem | idem | idem | idem | idem | ident canonical | **OK** |
| tipoAttrezzatura | idem | idem | badge oggetto | idem | raw + hydrate | N/A catalog seed | idem | N/A | **OK** |
| matricola | idem | idem | ident label | idem | raw + hydrate | `rowEntityFields` | idem | ident canonical | **OK** |
| marcaTelaio / modelloTelaio | idem | idem | telaio line | idem | raw + hydrate | `rowEntityFields` | idem | ident canonical | **OK** |
| targa / nScuderia | idem | idem | ident | idem | raw + hydrate | `rowEntityFields` | idem | ident canonical | **OK** |
| cliente / utilizzatore / cantiere | idem | idem | colonne lista | hub panoramica | raw + hydrate | `rowEntityFields` | idem | ident canonical | **OK** |
| km / oreLavoro | scheda.campi | snapshot scheda-only in export | N/A lista | hub / panoramica | raw | N/A | `pickSchedaOnlyFields` | N/A | **OK** |
| dataIngresso | scheda | scheda-only export | N/A | hub | raw | N/A | scheda-only | N/A | **OK** |
| descrizioneAnomalia / accessori | scheda | scheda-only | N/A | hub / form | raw | N/A | scheda-only | N/A | **OK** |
| note | `lavorazioni.note` | colonna nota | colonna | hub note | form | N/A | PDF | N/A | **DERIVED** |
| stato / priorita | `lavorazioni` | non ingresso field | pill stato | hub | tagliando fields | filtri stato | N/A | N/A | **DERIVED** |
| identificazioneMacchina | derivato + legacy persist | `resolveIdentificazioneMacchinaFromContext` | N/A | `hubIdentParts` | `identParts` readonly | N/A | PDF legacy field | `identParts` display; `doc.campi` persist | **LEGACY** display OK |

### Read path per surface (evidenza codice)

| Surface | Consumer | Resolver effettivo |
|---------|----------|-------------------|
| Tabella desktop | `lib/lavorazioni/lavorazioni-list-row-labels.ts` | `composeInterventoContextFromListRow` → `resolveInterventoOggettoDisplay` → `resolveInterventoDisplay` |
| Kanban | `lavorazioni-kanban-view.tsx` | `lavorazioneMacchinaLabel` → `interventoMacchinaLabel(display)` |
| Mobile/card | `lavorazione-mobile-cards.tsx` | `lavorazioneOggettoLabel` (canonical) |
| Filtri | `lavorazioni-advanced-filters.ts` `rowEntityFields` | `resolveInterventoDisplay` |
| Dettaglio/portale | `resolve-lavorazione-context-with-attrezzatura.ts` | `resolveInterventoDisplay` |
| Hub panoramica | `schede-lavorazione-modal.tsx` `panoramicaDisplayFields` | `interventoCtx.display` quando caricato |
| Hub loading fallback | `panoramicaDisplayFields` `!display` | merge `lav.*` per cliente/targa/matricola — **non marca** |
| Editor ingresso | `openIngressoEditor` | raw `campi` + `mergeSchedaIngressoWithMezzoPriority(..., edit_hydrate)` — no PATCH all'apertura |
| Export/PDF | `resolve-intervento-canonical.ts` mode `export` | `schedaIngressoFieldsFromDisplay` |
| Ricambi UI | `hubIdentParts` / `identParts` | `identificazionePartsFromInterventoDisplay` |
| `targetSnapshotFromInputs` | `build-intervento-context.ts` | structural-only (marca/modello catalogo **non** in target) |

**Nessun resolver parallelo con priorità catalogo** nei path lista/dettaglio/filtri/export verificati. `resolveAttrezzaturaLine` / `resolveTelaioLine` assenti (fallback-scan OK).

---

## 5. Static scan

### `lavorazioni-schede-fallback-scan.test.ts`

```
lavorazioni-schede-fallback-scan.test.ts OK
```

### Occorrenze pattern — classificazione

| File / pattern | Classe | Nota |
|----------------|--------|------|
| `resolve-ingresso-field-display.ts` `catalogValue` / `bootstrapField` | **BOOTSTRAP** | Solo caso C (scheda assente) |
| `build-intervento-context.ts` `catalogSnapshotFromInputs` | **CANONICAL** | Snapshot catalogo per bootstrap, non read display |
| `targetSnapshotFromInputs` marca `""` | **CANONICAL** | Structural-only, no display fallback |
| `resolve-intervento-display-for-surface.ts` `display.value \|\| base` | **CANONICAL** | Caso B: `"" \|\| ""` = `""`; non reintroduce catalogo se snapshot vuoto |
| `schede-autofill.ts` `buildSchedaIngressoFieldsFromContext` usa `mezzo.marca` | **BOOTSTRAP** | Solo create / assenza scheda in hub (`panoramicaCampi`) |
| `lavorazioni-view.tsx` `legacyLavBase` `mezzo.marca` | **LEGACY** | Usato per `lav.macchina` in capture/export modals — **non** colonna lista |
| `schede-lavorazione-modal.tsx` Ricambi `identificazioneMacchina` persist | **LEGACY** | Display via `identParts` canonical |
| `preventivi/*`, `ddt/*` `marcaAttrezzatura ??` | **DERIVED-INTENTIONAL** | Dominio preventivi, fuori scope lista |
| `mezzi-hub-merge.ts`, `identificazione-mezzo.ts` | **DERIVED-INTENTIONAL** | Anagrafica mezzi, non read intervento |
| `resolveAttrezzaturaLine` / `resolveTelaioLine` | **Assenti** | Rimossi da consumer lista |

Nessuna occorrenza classificata **BUG** nel read path canonical verificato.

---

## 6. Database audit

**Ambiente:** Supabase `CAB Gestionale` (`oxmnuovsgenqkuwfolqh`) — audit **eseguito**.

### Classificazione `marcaAttrezzatura`

| Classe | n |
|--------|---|
| campo_valorizzato | 155 |
| campo_vuoto | 4 |
| divergenza_scheda_catalogo | 2 |

### Classificazione `modelloAttrezzatura`

| Classe | n |
|--------|---|
| campo_valorizzato | 134 |
| campo_vuoto | 24 |
| divergenza_scheda_catalogo | 3 |

### Diagnostiche aggiuntive

| Query | Risultato |
|-------|-----------|
| scheda marca vuota AND catalogo valorizzato | **0** |
| candidati backfill migration (scheda vuota + catalogo marca) | **0** |
| migration `20260901150000_scheda_ingresso_backfill_marca_modello` applicata | **No** (non in `schema_migrations`) |

### Esempi divergenza scheda ≠ catalogo (intenzionale)

| codice | scheda_marca | catalog_marca |
|--------|--------------|---------------|
| 26-0151 | BTE | AMS |
| 26-0197 | BTE | AMS |

**Interpretazione:** divergenza **intenzionale** (scheda valorizzata diversa da anagrafica attrezzature) — coerente con regola A (SSOT = scheda).

### Backfill migration (review statica)

- Non sovrascrive valori presenti: **OK** (WHERE campo null/vuoto)
- Solo scheda presente + campo vuoto: **OK**
- Non tocca `matricola`: **OK**
- Scope `tipo='ingresso'`, `deleted_at IS NULL`: **OK**

**Pre/post migration:** non eseguita (0 candidati attuali; migration non applicata).

---

## 7. Cache verification

### Catena analizzata

```
DB/server → fetchSchedeRows → schede-sync-adapter
  → preferRicherSchedeBundle (merge local vs fetched)
  → React Query SCHEde_BUNDLES_QUERY_KEY
  → composeInterventoContextFromListRow
  → resolveInterventoDisplay → lavorazioneMacchinaLabel
```

### Caso DB=Haller, localStorage=Doppstadt (simulazione)

`preferRicherSchedeBundle(local=Doppstadt, server=Haller)` con stesso conteggio schede:

```
merged=Haller label=Haller M
```

**Regola osservata:** a parità di conteggio schede, vince il bundle **fetched** (`return b`), salvo local con addetto e fetched senza.

### Test automatici cache

| Test | Esito |
|------|-------|
| `lavorazioni-schede-badge-cache.test.ts` | OK |
| `schede-bundle-cache-merge.test.ts` | OK |

### Limiti verifica

Navigazione browser lista→dettaglio→scheda→lista e scenario localStorage reale in browser **non eseguiti** in questa sessione. Evidenza limitata a merge function + consumer label.

---

## 8. Ricambi verification

| Check | Esito |
|-------|-------|
| `resolveIdentificazioneMacchinaFromContext` con scheda `Haller` vs catalogo `Doppstadt` | ident contiene `Haller` |
| Catalog contradiction ident | `Marca attrezzatura: Haller • Modello: Model-H` |
| UI `SchedaRicambiFormBody` | `identParts` canonical per display readonly |
| Campo persistito `doc.campi.identificazioneMacchina` | **LEGACY** — fallback `identLine` canonical se vuoto; può restare stale fino a save |

---

## 9. Automated tests

| Suite | Comando | Esito |
|-------|---------|-------|
| Coherence | `npx tsx lib/regression/lavorazioni-schede-coherence.test.ts` | **OK** |
| Fallback scan | `npx tsx lib/regression/lavorazioni-schede-fallback-scan.test.ts` | **OK** |
| Export alignment | `npx tsx lib/regression/intervento-export-ui-alignment.test.ts` | **OK** |
| Oggetto display | `npx tsx lib/domain/mezzo-attrezzatura/intervento-oggetto-display.test.ts` | **OK** |
| edit_hydrate | `npx tsx lib/schede/merge-scheda-ingresso-with-mezzo-priority.test.ts` | **OK** |
| Badge cache | `npx tsx lib/regression/lavorazioni-schede-badge-cache.test.ts` | **OK** |
| Bundle cache merge | `npx tsx lib/schede/schede-bundle-cache-merge.test.ts` | **OK** |
| smoke:regression:core | `npm run smoke:regression:core` | **FAIL** — `notification-service.test.ts` (push channel assert, non coherence) |
| ci:tsc | `npm run ci:tsc` | **FAIL** — vedi Findings |
| control:pr | `npm run control:pr` | **FAIL** — `pass=27 fail=6 blocked=28 blockers=6` |

Coherence tests in `smoke-regression-lists.ts` (coherence, fallback-scan, badge-cache): **passati** prima del fail su notification.

---

## 10. E2E

| Scenario | Esito |
|----------|-------|
| `e2e/smoke/13-lavorazioni-scheda-ingresso.spec.ts` | **SKIPPED** — `SMOKE_ADMIN_EMAIL` / `SMOKE_ADMIN_PASSWORD` non configurati |
| Flusso UI Doppstadt (lista→dettaglio→scheda→refresh) | **SKIPPED** — stesso motivo |

Copertura alternativa: test unitari Doppstadt + catalog contradiction (sezione 2–3).

---

## 11. Findings

### BLOCKER

| ID | Descrizione |
|----|-------------|
| B1 | **`ci:tsc` FAIL** — `schede-lavorazione-modal.tsx` usa `buildSchedaIngressoFieldsFromContext`, `buildSchedaLavorazioniFieldsFromContext`, `buildSchedaRicambiFieldsFromContext` senza import da `@/lib/schede/schede-autofill`. Blocca build e `control:pr` (`security.typescript.compile`). |

### HIGH

| ID | Descrizione |
|----|-------------|
| H1 | `control:pr` tier fallito (6 blocker incluso tsc, `runtime.regression.p0`, `data.supabase.connection` in ambiente locale verifica). |
| H2 | `smoke:regression:core` interrotto da fail `notification-service.test.ts` (fuori scope coherence ma gate repo rosso). |

### MEDIUM

| ID | Descrizione |
|----|-------------|
| M1 | E2E smoke 13 non eseguito — nessuna evidenza UI browser per flusso Doppstadt end-to-end. |
| M2 | Verifica cache limitata a simulazione merge + label; navigazione browser e localStorage reale non testati. |

### LOW

| ID | Descrizione |
|----|-------------|
| L1 | Ricambi: campo persistito `identificazioneMacchina` può divergere da canonical fino al prossimo save (display usa `identParts`). |
| L2 | Hub `panoramicaDisplayFields` durante loading (`!interventoCtx.display`) merge `lav.*` per alcuni campi — finestra breve, marca non coinvolta. |

### INFORMATIONAL

| ID | Descrizione |
|----|-------------|
| I1 | 2 record DB con divergenza scheda/catalogo marca (BTE vs AMS) — **intenzionale** per regola A. |
| I2 | Migration backfill marca/modello non ancora applicata su DB remoto; 0 candidati attuali. |
| I3 | 4 schede con `marcaAttrezzatura` vuoto, 0 con catalogo valorizzato simultaneo — caso Doppstadt non presente in DB produzione. |
| I4 | `legacyLavBase` (`mezzo.marca` embed) usato solo per capture modals / prop `lav` — non per rendering colonna lista. |

---

## 12. Final verdict

**`VERIFIED WITH FINDINGS`**

### Criteri PASS remediation coherence

| Criterio | Esito |
|----------|-------|
| SSOT = canonical = tabella = dettaglio = filtri = export = Ricambi (read) | **Sì** |
| Nessun fallback silenzioso caso B | **Sì** |
| `edit_hydrate` non persiste all'apertura | **Sì** |
| Catalog contradiction permanente in test suite | **Sì** |
| TSC blocker coherence risolto | **Sì** |
| Gate repo completo (smoke + control:pr + build + E2E) | **No** |

### Conclusione

La **remediation coherence** è **verificata e certificata** a livello funzionale e test. Il gate repository completo resta rosso per failure **UNRELATED/ENVIRONMENT** documentati in §13.

---

## 13. Final gate remediation

**Data:** 2026-09-01 (sessione gate-closure)

### Modifiche applicate (scope minimo)

| File | Modifica |
|------|----------|
| `components/lavorazioni/schede/schede-lavorazione-modal.tsx` | Import `buildSchedaIngressoFieldsFromContext`, `buildSchedaLavorazioniFieldsFromContext`, `buildSchedaRicambiFieldsFromContext` da `@/lib/schede/schede-autofill` |
| `lib/regression/lavorazioni-schede-coherence.test.ts` | Aggiunto blocco permanente **catalog contradiction** (Haller/Doppstadt/Farid) + assert Ricambi `identParts` |

Nessuna modifica a resolver canonical A/B/C.

### TSC

| | |
|---|---|
| Prima | **FAIL** — `buildScheda*` non importati in `schede-lavorazione-modal.tsx` |
| Dopo | **PASS** — `npm run ci:tsc` → `STATUS: PASS (0 blockers)` |

### Coherence tests

```
lavorazioni-schede-coherence.test.ts OK          (include catalog contradiction)
lavorazioni-schede-fallback-scan.test.ts OK
intervento-export-ui-alignment.test.ts OK
intervento-oggetto-display.test.ts OK
merge-scheda-ingresso-with-mezzo-priority.test.ts OK
lavorazioni-schede-badge-cache.test.ts OK
```

### Fallback scan

```
lavorazioni-schede-fallback-scan.test.ts OK
```

Nessun nuovo pattern **BUG** introdotto.

### Smoke regression (`npm run smoke:regression:core`)

**FAIL** — interrotto su `lib/notifications/application/notification-service.test.ts` L69.

| Classificazione | **FLAKY / ENVIRONMENT** |
|-----------------|-------------------------|
| Related coherence? | **No** |
| Root cause | `ChannelPolicyResolver` filtra `push` durante **quiet hours** (`defaultPreferences`: 22:00–07:00). Esecuzione alle ~03:00 locale → `push` assente. Evidenza: `resolveChannels(..., now=noon)` → include `push`; `now=23:00` → esclude `push`. |
| Fix applicato? | **No** — non regressione dimostrata da modifiche notifiche; fuori scope coherence gate closure |
| Coherence tests in smoke core | **PASS** (`lavorazioni-schede-coherence`, `fallback-scan`, `badge-cache`) |

### Control Plane (`npm run control:pr`)

**FAIL** — `SUMMARY: pass=28 fail=6 blocked=27 blockers=6` (TSC ora **pass**, +1 vs sessione precedente)

| # | Controllo | Root cause | Related coherence? | Fix required? | Status finale |
|---|-----------|------------|-------------------|---------------|---------------|
| 1 | `security.typescript.compile` | Import mancanti modal | **DIRECT** | Sì | **PASS** |
| 2 | `domain.build.production` | `PWA_BUILD_VERSION` mancante localmente; budget KB superato con env impostato | **ENVIRONMENT / UNRELATED** | No (coherence) | **FAIL** |
| 3 | `data.supabase.connection` | Env mancanti: `NEXT_PUBLIC_SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY` | **ENVIRONMENT** | No (coherence) | **FAIL** |
| 4 | `data.production.readiness` | Bloccato da #3 | **ENVIRONMENT** | No | **blocked** |
| 5 | `runtime.regression.p0` | Fail client-portal / rbac-log migration order (4 test) | **UNRELATED** | No (coherence) | **FAIL** |
| 6 | `runtime.smoke.preflight` | `SMOKE_ADMIN_EMAIL/PASSWORD` mancanti | **ENVIRONMENT** | No (coherence) | **FAIL** |
| 7 | `governance.report.v2.semantic-contract` | Report v2 contracts | **UNRELATED** | No (coherence) | **FAIL** |

### Lint / build

| Gate | Esito |
|------|-------|
| `npm run lint` | **PASS** (0 errori, 11 warning preesistenti) |
| `npm run ci:build` | **FAIL** — build compila con `PWA_BUILD_VERSION=gate-local` ma **budget gate** superato su più route (>1900KB). **UNRELATED** coherence |

### E2E

```
E2E = NOT EXECUTED
Reason = missing smoke credentials (SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD)
```

### DB audit (read-only, 2026-09-01)

| Metrica | Valore |
|---------|--------|
| marca valorizzate | 155 |
| marca vuote | 4 |
| divergenza scheda≠catalogo | 2 (intenzionale) |
| scheda vuota + catalogo valorizzato | **0** |
| Backfill eseguito | **No** (0 candidati) |

### Ricambi legacy

Scenario `canonical=Haller`, `legacy persisted=Doppstadt`:

- `identParts` da `identificazionePartsFromInterventoDisplay` → **Haller**
- `SchedaMezzoIdentificazioneReadonly` usa bands da `identParts`; fallback legacy solo se bands vuote

**Classificazione:** `LEGACY COMPATIBILITY — NON BLOCKING`

### Output riepilogativo gate closure

```text
COHERENCE REMEDIATION     PASS
TSC                       PASS
LINT                      PASS
BUILD                     FAIL (budget/env — UNRELATED)
COHERENCE TESTS           PASS
FALLBACK SCAN             PASS
SMOKE REGRESSION          FAIL (notification quiet-hours FLAKY — UNRELATED)
CONTROL:PR                FAIL (env/build/report — UNRELATED)
E2E 13                    NOT EXECUTED
DB AUDIT                  PASS

FINAL VERDICT             VERIFIED WITH FINDINGS
```

---

*Gate closure: modifiche minime TSC + test catalog-contradiction; report aggiornato 2026-09-01.*
