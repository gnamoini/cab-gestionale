# Diagnosi forense CI — spec 13 (`bfe8e27`)

**Data:** 2026-06-09  
**SHA:** `bfe8e276daa31331ff87fe677a4642f4a7529faf`  
**Runs:** [gate #78](https://github.com/gnamoini/cab-gestionale/actions/runs/27178944782) · [cert #43](https://github.com/gnamoini/cab-gestionale/actions/runs/27178944789)  
**Evidenza grezza:** [`docs/forensic/gate-78-annotations.json`](forensic/gate-78-annotations.json) · [`docs/forensic/cert-43-annotations.json`](forensic/cert-43-annotations.json)

**Vincolo:** nessuna modifica codice applicativa. Solo estrazione evidenza.

---

## 1. Accesso log (todo auth-logs)

| Tentativo | Esito |
|---|---|
| GitHub API `check-runs/.../annotations` | **OK** — stack trace completi (JSON salvato) |
| GitHub API `jobs/.../logs` | **403** — `Must have admin rights to Repository` |
| `gh` CLI | **Non installato** |
| `winget install GitHub.cli` | **Fallito** (origine winget non disponibile) |
| Artifact workflow | **Assenti** — pagina run mostra `Artifacts –` |
| Repro locale | **SKIP** — `SMOKE_ADMIN_EMAIL` vuoto in `.env.local` |

### Artefatti Playwright (config vs disponibilità)

| Artefatto | Config CI | Disponibile pubblicamente |
|---|---|---|
| Screenshot | `only-on-failure` | **No** — non uploadato dal workflow |
| Video | `off` | **No** |
| Trace | `on-first-retry` | **No** — esiste su runner retry, non scaricabile senza auth job log |

---

## 2. Gate #78 — estrazione integrale

### Metadati step (API jobs)

| Campo | Valore |
|---|---|
| Workflow step | **#19** `Scheda Ingresso desktop smoke (spec 13 full flow)` |
| Inizio / fine | `02:00:09Z` → `02:01:30Z` (**81s**) |
| Job totale | **5m 7s** |
| Step precedente | #18 Smoke Playwright — **24 passed, 4 skipped** (1.4m) |

### Assertion esatta
```
TimeoutError: locator.scrollIntoViewIfNeeded: Timeout 20000ms exceeded.
Call log:
  - waiting for getByRole('dialog').filter({ hasText: 'Nuova lavorazione' })
      .getByRole('combobox', { name: 'Cantiere', exact: true })
```

### Stack trace
```
at fillListCombobox (e2e/helpers/lavorazioni-scheda.ts:121:15)
at fillSchedaIngressoCreateForm (e2e/helpers/lavorazioni-scheda.ts:174:9)
at e2e/smoke/13-lavorazioni-scheda-ingresso.spec.ts:58:3
```

Codice L119–124:
```typescript
const root = scope ?? page;
const input = root.getByRole("combobox", { name: ariaLabel, exact: true });
await input.scrollIntoViewIfNeeded();  // ← FAIL
```

### Test e retry
- **Test:** `create → save → hub panoramica → edit ingresso → scheda lavorazioni` (spec L49)
- **Progetto:** `chromium` only (`--grep-invert "iOS regression"`)
- **Retry:** 3 tentativi identici (originale + #1 + #2)

### Timeline inferita (gate)

| # | Azione | Esito | Evidenza |
|---|---|---|---|
| 1 | `loginViaUi` | OK | step raggiunto |
| 2 | `goto /lavorazioni` | OK | idem |
| 3 | `clickNuovaLavorazioneCta` | OK | idem |
| 4 | `fillSchedaIngressoCreateForm` → Data ingresso | OK | fail successivo |
| 5 | `fillListCombobox` Cliente (L172) | OK inferito | fail su L174, non L172 |
| 6 | `fillListCombobox` Cantiere (L174) | **FAIL** | annotation |
| 7 | `submitCreateLavorazione` | **Non eseguito** | L59 |
| 8 | Hub / edit / lavorazioni | **Non eseguito** | L61+ |

### Network / console / persistenza (gate)

| Verifica | Risultato |
|---|---|
| POST `/rest/v1/lavorazioni` | **Non atteso** — `waitForLavorazioneCreate` mai raggiunto |
| POST/PATCH `/rest/v1/scheda_lavorazione` | **Non atteso** — idem |
| Payload `cliente` | **Non testato** |
| Lavorazione creata | **No** |
| Scheda salvata | **No** |
| Menzioni network in annotations | **Nessuna** (solo nomi file test) |
| `pageerror` / `console.error` | **Nessuna** in annotations; guard attivo avrebbe fallito test |

---

## 3. Cert #43 — estrazione integrale

### Metadati step

| Campo | Valore |
|---|---|
| Workflow step | **#11** `Scheda Ingresso mobile cert (spec 13)` |
| Inizio / fine | `02:03:58Z` → `02:11:35Z` (**457s ≈ 7.6m**) |
| Job totale | **15m 15s** |

### Assertion esatta
```
TimeoutError: locator.click: Timeout 20000ms exceeded.
Call log:
  - waiting for getByRole('dialog').filter({ hasText: 'Nuova lavorazione' })
      .getByRole('combobox', { name: 'Cliente', exact: true })
```

### Stack trace
```
at fillMinimalCreateAndSaveWithoutClienteBlur (e2e/helpers/lavorazioni-scheda.ts:225:22)
at e2e/smoke/13-lavorazioni-scheda-ingresso.spec.ts:46:3
```

Codice L223–228:
```typescript
const clienteInput = modal.getByRole("combobox", { name: "Cliente", exact: true });
await clienteInput.click();  // ← FAIL
```

### Test e retry
- **Test:** `iOS regression: cliente combobox salvato senza blur prima del submit` (spec L39)
- **Progetti falliti:** chromium, mobile-android, mobile-ios-chromium, mobile-ios, tablet-ios (**5/5**)
- **Retry:** 2 per progetto (CI `retries: 2`)

### Timeline inferita (cert)

| # | Azione | Esito | Evidenza |
|---|---|---|---|
| 1 | login + goto | OK | |
| 2 | `clickNuovaLavorazioneCta` | OK | |
| 3 | modal visible + `waitForGlobalOptionsReady` | OK | L217–219 prima del fail |
| 4 | fill Data ingresso | OK | |
| 5 | `fillListCombobox` Marca attrezzatura (L222) | OK inferito | fail su L225 |
| 6 | `clienteInput.click()` (L225) | **FAIL** | annotation |
| 7 | `requestSubmit` + `waitForSchedaPersist` | **Non eseguito** | L229–233 |

### Network / persistenza (cert)
Identico al gate: **nessun submit, nessuna persistenza, payload `cliente` non verificabile**.

---

## 4. Analisi DOM (todo dom-snapshot)

**Senza screenshot/trace** — inferenza da call log Playwright + codice.

### Semantica call log
La stringa `waiting for getByRole('dialog').filter(...).getByRole('combobox', ...)` indica che Playwright **non ha mai risolto il locator** (0 nodi attached) entro `actionTimeout` 20s. Non è un assert su valore campo né un fallimento post-submit.

### Stato DOM inferito al momento del fail

| Elemento | Gate #78 | Cert #43 |
|---|---|---|
| Dialog `Nuova lavorazione` | **Incerto** — catena include filter; può essere assente o senza combobox target | **Incerto** |
| Combobox target (Cantiere / Cliente) | **Assente nel scope** del dialog filtrato | **Assente nel scope** |
| Listbox portal aperto | **N/D** — non in call log | **N/D** |
| N dialog attivi | **N/D** | **N/D** |

### Ipotesi DOM ordinate per evidenza

1. **Modal chiuso o smontato** dopo interazione combobox precedente (Cliente gate / Marca cert) — spiega 0 match su campo successivo nella stessa sezione logica.
2. **Locator scope `modal` stale** — `modal` catturato a L166/L217; se React remounta il form dopo `onPatch` / Aggiungi elenco, i combobox potrebbero non essere discendenti dello stesso subtree (meno probabile con stesso dialog title).
3. **Overlay / secondo dialog** (`MezzoRegistratoIngressoDialog`) — presente in [`scheda-ingresso-form-modal.tsx`](components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx) L294–299; tipicamente si apre su match matricola/targa, **dopo** Cantiere nel full-flow; non spiega gate fail pre-matricola salvo side-effect Aggiungi cliente.
4. **Viewport / scroll** (cert) — `clienteInput.click()` senza `scrollIntoViewIfNeeded`; Marca compilata con scroll. Meno probabile su **chromium desktop** dove cert fallisce ugualmente.

### Cosa verificherebbe screenshot/trace (checklist per chiusura 100%)

- [ ] Numero di `role=dialog` visibili
- [ ] Presenza `aria-label="Cantiere"` / `"Cliente"` nel DOM
- [ ] Listbox `role=listbox` ancora aperto nel portal
- [ ] Scroll position del `GestionaleModalScrollBody`
- [ ] Eventuale `MezzoRegistratoIngressoDialog` aperto
- [ ] Messaggio errore React / `globalOpts.isError` nel body modale

---

## 5. Conferma assenza network (todo confirm-no-network)

### Evidenza diretta
- **0** occorrenze di `POST`, `scheda_lavorazione`, `waitForResponse`, `payload`, `cliente in scheda` nei messaggi annotation (grep su JSON forense).
- Fail avviene in helper **pre-submit** (L121 gate, L225 cert).

### Evidenza indiretta (timing)
| Run | Durata step fail | Modello atteso |
|---|---|---|
| Gate #78 | 81s | 1 test × 3 retry × 20s timeout ≈ 60s + overhead ✓ |
| Cert #43 | 457s | 5 progetti × 3 run × 20s ≈ 300s + overhead ✓ |

Se il fail fosse su `waitForSchedaPersist` (90s) o assert payload, durata e messaggio errore sarebbero diversi.

### Conclusione network
**Confermato con alta confidenza:** nessuna creazione lavorazione né scrittura scheda al momento del fail su `bfe8e27`.

---

## 6. Categorie problema

| Run | Categoria primaria | Submit layer | Hub | Backend |
|---|---|---|---|---|
| Gate #78 | **selector instability** / **modal lifecycle** | Escluso | Non raggiunto | Escluso |
| Cert #43 | **selector instability** / **timing** (ordine fill) | Escluso | Non raggiunto | Escluso |

---

## 7. Root Cause Candidates

### #1 — Modal lifecycle / DOM non più coerente con locator scope (primaria)

**Probabilità:** ~65% gate · ~55% cert

**Ipotesi:** Dopo `fillListCombobox` sul campo precedente, il dialog `Nuova lavorazione` o i combobox nella sezione anagrafica **non sono più risolvibili** con `modal.getByRole('combobox', { name, exact: true })` entro 20s. Possibili trigger: remount form, chiusura modale, errore runtime silente, overlay figlio.

**Evidenza:**
- Call log `waiting for` su catena completa (non solo visibility)
- Retry ripetuti identici
- Campo precedente nella sequenza helper presumibilmente completato
- `aria-label` corretto in sorgente UI (`Cantiere` L97, `Cliente` L86)

### #2 — Orchestrazione E2E / ordine fill / portal combobox (secondaria)

**Probabilità:** ~25% gate · ~40% cert

**Ipotesi gate:** `fillListCombobox` Cliente (token AUDIT nuovo → flusso Aggiungi) lascia stato UI (portal listbox, focus trap) che impedisce risoluzione Cantiere.

**Ipotesi cert:** `fillMinimalCreateAndSaveWithoutClienteBlur` compila **Marca** (sezione bassa, con `scrollIntoViewIfNeeded`) poi cerca **Cliente** senza scroll né dismiss esplicito — su 5 viewport il combobox Cliente non risulta attached nel scope.

**Evidenza:**
- [`fillListCombobox`](e2e/helpers/lavorazioni-scheda.ts) dismiss listbox solo a fine interazione
- [`GlobalSelect`](components/gestionale/global-input/global-select.tsx) dropdown in portal `document.body`
- Cert fallisce anche su **chromium desktop** → non solo WebKit viewport

### Deprioritizzate

| Categoria | Prob. | Motivo |
|---|---|---|
| Submit layer | <5% | Fail pre-`requestSubmit` |
| Backend / payload | <5% | Nessuna network write |
| Hub orchestration | 0% | Hub non raggiunto |
| Cleanup | 0% | Causa post-fail |

---

## 8. Verdetto diagnostico

| | Gate #78 | Cert #43 |
|---|---|---|
| Diagnosi certa al 100% | **No** | **No** |
| Layer colpevole (alta conf.) | E2E locator / modal DOM | E2E locator / fill order |
| Submit / payload `cliente` | **Fuori perimetro** run | **Fuori perimetro** run |
| Dati mancanti | Job log auth, screenshot, trace | Idem |

**Nota storica:** fail precedenti (~84s, assert payload `cliente`) differiscono da #78/#43 (timeout locator in fase fill). Non dimostra submit risolto — solo **failure mode diverso** su questo SHA.

---

## 9. Azione minima per diagnosi certa

1. Login GitHub owner → aprire log step #19 / #11 → cercare `test-results` path e screenshot
2. Oppure: `gh auth login` + `gh run download 27178944782` / `27178944789`
3. Popolare `SMOKE_ADMIN_*` in `.env.local` e repro locale con `trace: on` sul singolo test fallito
