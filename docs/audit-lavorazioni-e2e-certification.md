# Certificazione E2E — Lavorazioni e Scheda di Ingresso

**Data:** 2026-06-08  
**Ambiente target:** locale `npm run dev` + Supabase (`.env.local`)  
**Mobile:** emulazione Playwright (Pixel 7, iPhone 14, iPad Pro 11)

---

## Artefatti implementati

| Artefatto | Percorso |
|-----------|----------|
| Fixture dati test (19 campi ingresso + scheda lavorazioni) | [`e2e/fixtures/scheda-ingresso-test-data.ts`](../e2e/fixtures/scheda-ingresso-test-data.ts) |
| Helper UI Playwright | [`e2e/helpers/lavorazioni-scheda.ts`](../e2e/helpers/lavorazioni-scheda.ts) |
| Spec E2E | [`e2e/smoke/13-lavorazioni-scheda-ingresso.spec.ts`](../e2e/smoke/13-lavorazioni-scheda-ingresso.spec.ts) |
| Verifica DB post-run | [`scripts/verify-lavorazione-audit-db.ts`](../scripts/verify-lavorazione-audit-db.ts) |
| Audit statico wiring | [`lib/regression/lavorazioni-e2e-certification-audit.test.ts`](../lib/regression/lavorazioni-e2e-certification-audit.test.ts) |
| Progetti Playwright mobile | [`e2e/playwright.config.ts`](../e2e/playwright.config.ts) |

---

## Campi testati (matrice)

### Scheda Ingresso (19 campi)

`dataIngresso`, `addettoAccettazione`, `cliente`, `cantiere`, `utilizzatore`, `richiedente`, `tipoAttrezzatura`, `marcaAttrezzatura`, `modelloAttrezzatura`, `matricola`, `nScuderia`, `tipoTelaio`, `marcaTelaio`, `modelloTelaio`, `targa`, `oreLavoro`, `km`, `livelloCarburante`, `descrizioneAnomalia`, `noteIntervento`.

**Create-only:** `stato`, `priorita` (pill → tabella `lavorazioni`).

**Non nel form ingresso:** checkbox, radio, allegati (media panel separato).

### Scheda Lavorazioni

`identificazioneMacchina`, riga: `dataLavorazione`, `lavorazioniEffettuate`, `addettiAssegnati` (ore).

### Superfici visualizzazione coperte dallo spec

- Tabella lavorazioni (ricerca per token)
- Hub schede → Panoramica
- Modal modifica Scheda ingresso
- Editor Scheda lavorazioni

**Non automatizzato nello spec:** PDF export (apertura tab), kanban card, portale clienti.

---

## Come eseguire la certificazione completa

### 1. Prerequisiti

```bash
# Terminal 1
npm run dev

# Terminal 2 — credenziali smoke (vedi .env.smoke.example)
$env:SMOKE_ADMIN_EMAIL="..."
$env:SMOKE_ADMIN_PASSWORD="..."
$env:SMOKE_BASE_URL="http://127.0.0.1:3000"
$env:SMOKE_NO_WEB_SERVER="1"
```

`.env.local` deve contenere `NEXT_PUBLIC_SUPABASE_*` e `SUPABASE_SERVICE_ROLE_KEY` per verify DB.

### 2. Playwright (Desktop + mobile emulato)

```bash
npx playwright test -c e2e/playwright.config.ts e2e/smoke/13-lavorazioni-scheda-ingresso.spec.ts
```

Progetti: `chromium`, `mobile-android`, `mobile-ios`, `tablet-ios`.

**Test inclusi:**

1. **iOS regression:** digita `Cliente` senza blur → tap Salva lavorazione → verifica payload/cliente in lista.
2. **Flusso completo:** create tutti i campi → hub panoramica → edit ingresso (`-EDIT`) → scheda lavorazioni → salva.

### 3. Verifica database

Dopo un run con token visibile (es. `AUDIT-20260608-143045`):

```bash
npx tsx scripts/verify-lavorazione-audit-db.ts --token AUDIT-20260608-143045
npx tsx scripts/verify-lavorazione-audit-db.ts --token AUDIT-20260608-143045 --edit
```

Confronta ogni campo `contenuto.doc.campi` e `lavorazioni.note`.

### 4. Regression unit

```bash
npx tsx lib/regression/lavorazioni-e2e-certification-audit.test.ts
npx tsx lib/regression/scheda-ingresso-ios-save-audit.test.ts
npx tsx lib/regression/debug-instrumentation-policy.test.ts
npx tsx lib/schede/scheda-ingresso-roundtrip.test.ts
npm run ios:check
```

---

## Esiti esecuzione (sessione audit)

| Verifica | Esito | Note |
|----------|-------|------|
| Audit statico wiring | OK | `lavorazioni-e2e-certification-audit.test.ts` |
| iOS save audit | OK | fix flush combobox attivo |
| debug-instrumentation-policy | OK | nessun `console.log` in app/components |
| ios:check | PASS | warning preesistenti font-size scheda lavorazioni |
| Playwright spec (chromium) | **Skipped** | `SMOKE_ADMIN_EMAIL` / `SMOKE_ADMIN_PASSWORD` non configurati in shell |
| Verify DB script | Non eseguito | richiede run E2E + token + service role |

---

## Problemi trovati

| ID | Descrizione | Gravità | Stato |
|----|-------------|---------|-------|
| — | Nessun difetto funzionale riprodotto in questa sessione (Playwright non eseguito per assenza credenziali smoke) | — | — |

## Problemi corretti (sessione precedente, validati da unit test)

- Perdita dati combobox su submit iOS → `gestionale-form-submit-flush` + `onSubmitCapture`
- `draftRef` stale → sync in `onPatch` + `flushSync`

## Problemi non riproducibili

- Perdita dati su dispositivo iOS fisico: non testato (solo emulazione Playwright prevista; richiede credenziali + run manuale)

---

## Verifica piattaforme

| Piattaforma | Metodo | Esito sessione |
|-------------|--------|----------------|
| Desktop | Playwright `chromium` | Skipped (no credenziali) |
| Android emulato | Playwright `mobile-android` | Non eseguito |
| iOS emulato | Playwright `mobile-ios` / `tablet-ios` | Non eseguito |
| Samsung Internet / Chrome iOS reali | Non emulabili fedelmente | Checklist manuale se necessario |

---

## Verifica database

Script pronto: confronto campo-per-campo su `scheda_lavorazione` (tipo `ingresso`) e sync `lavorazioni.note`.

**Layer payload:** lo spec intercetta `**/rest/v1/scheda_lavorazione**` e verifica `campi.cliente` nel test iOS regression.

---

## Verifica visualizzazione

Automatizzato nello spec (quando eseguito con credenziali):

- Tabella: ricerca token
- Hub Panoramica: cliente, richiedente, note
- Modal edit: valore combobox Cliente
- Post-edit: testo `-EDIT` in panoramica
- Scheda lavorazioni: identificazione macchina in panoramica

---

## Strumentazione debug — audit (Fase 9)

### Trovata

| Elemento | File | Valutazione |
|----------|------|-------------|
| `debugTag` in `useGlobalOptions` | lavorazioni-view, schede-lavorazione-modal, … | **Lasciato** — etichetta per log opt-in |
| `debugSelectOptions` | `src/shared/selectors/debug-options-log.ts` | **Lasciato** — gated `NEXT_PUBLIC_DEBUG_SELECT_OPTIONS=1` |
| `logClientPortalPipelineDebug` | `lib/lavorazioni/client-portal-list-filters.ts` | **Lasciato** — `NODE_ENV===development` only |
| `console.log` in `*.test.ts` | lib/schede, e2e | **Lasciato** — output test runner |

### Rimossa

**Nessuna** — perimetro `components/gestionale/lavorazioni` e `components/lavorazioni/schede` privo di `console.log`/`console.debug`; policy CI già verde.

### Strumenti lasciati e motivazione

- Flag `NEXT_PUBLIC_DEBUG_SELECT_OPTIONS` — diagnostica elenchi select in dev
- `debug-instrumentation-policy.test.ts` — gate CI anti-ingest e anti-console.log

---

## Verifica regressioni finale

| Check | Esito |
|-------|-------|
| `debug-instrumentation-policy.test.ts` | OK |
| `scheda-ingresso-ios-save-audit.test.ts` | OK |
| `lavorazioni-e2e-certification-audit.test.ts` | OK |
| `ios:check` | PASS |
| Playwright E2E | Pending credenziali smoke |

---

## Edge case (copertura spec)

- Salvataggio combobox senza blur (iOS)
- Multiriga + emoji/caratteri speciali in fixture
- Edit parziale campi con suffisso `-EDIT`
- Aggiunta dinamica valori elenco (`Aggiungi «…»`) per combobox strict

**Non coperto nello spec:** paste 8000 char, copia ultima scheda, PDF, IME composition.

---

## Limiti dichiarati

1. Playwright non sostituisce Safari iOS / Samsung Internet reali.
2. Senza `SMOKE_ADMIN_*` i test E2E sono skipped by design.
3. Checkbox/radio/allegati non presenti nel form Scheda Ingresso.
