# Audit: modal «Nuova lavorazione» (Scheda ingresso)

Data: 2026-06-03  
Scope: `/lavorazioni` → `LavorazioneCreateModal` + `SchedaIngressoFormBody`  
Vincoli: nessuna nuova funzione, nessun cambio API/tipi/UX oltre ai bugfix.

## Flusso

1. Toolbar `+ Nuova lavorazione` → `createOpen` in [`lavorazioni-view.tsx`](../components/gestionale/lavorazioni/lavorazioni-view.tsx).
2. [`LavorazioneCreateModal`](../components/gestionale/lavorazioni/lavorazione-create-modal.tsx) → shell [`SchedaIngressoFormModalShell`](../components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx) → [`LavorazioniModalShell`](../components/gestionale/lavorazioni/lavorazioni-modals.tsx).
3. Submit: validazione client → `upsertMezzoFromSchedaIngresso` → `useLavorazioneCreateMutation` → `loadLavorazioneSchedeStore` + `persistSchedeStore` → `onCreated` + chiusura.

## Test effettuati

| Fase | Esito | Note |
|------|-------|------|
| Apertura toolbar | Pass | Browser locale `/lavorazioni`, dialog «Nuova lavorazione», sezioni Ingresso/Cliente/Attrezzatura, data odierna IT |
| Chiusura X/ESC/overlay | Pass (codice) | `LavorazioniModalShell`: ESC, overlay click, `useBodyScrollLock` |
| Riapertura form vuoto | Pass (post-fix) | Reset stato su `open=false` + `key` remount |
| Campi / pill / autocomplete | Pass (codice + smoke UI) | `GlobalDatePicker`, `GlobalFixedListPillSelect`, `SchedaIngressoIdentAutocompleteField` |
| Permessi | Pass (codice) | Pulsante disabilitato se `!createdBy` o `!canEditWorkOrders` |
| A11y | Pass (codice) | `role="dialog"`, `aria-modal`, focus trap, `aria-labelledby` |
| Typecheck | Pass | `npx tsc --noEmit` |
| Unit test schede | N/A | Vitest alias `@/` non risolto in run isolato (pre-esistente) |

Test non eseguiti in automazione: tablet/mobile viewport, salvataggio E2E rete, utente readonly live.

## Problemi trovati e gravità

### Critico
Nessuno.

### Alto
Nessuno bloccante su apertura/permessi.

### Medio (corretti)

| ID | Problema | Causa | Fix |
|----|----------|-------|-----|
| M1 | Form con dati sessione precedente alla riapertura | Reset solo in `useEffect` dopo `open=true` | Reset completo su `open=false`; `key` su `LavorazioneCreateModal` in view |
| M2 | Modal chiuso anche se sync scheda fallisce | `onClose`/`onCreated` sempre dopo `persistSchedeStore` | Chiusura solo se `res.ok`; errore in form + toast; retry solo persist via `createdLavorazioneIdRef` |

### Basso (corretto)

| ID | Problema | Fix |
|----|----------|-----|
| L3 | `catch` vuoto su submit | `submitError` + `gestToast.error` per errori non-mutation |

### Basso (non modificato)

- Nessun dialog «modifiche non salvate» in create (coerente con hub schede che lo ha solo in edit).
- `NewLavorazioneModal` legacy in `lavorazioni-modals.tsx` non referenziato (dead code).

## Correzioni applicate

- [`lavorazione-create-modal.tsx`](../components/gestionale/lavorazioni/lavorazione-create-modal.tsx): M1, M2, L3, retry scheda senza doppia create.
- [`lavorazioni-view.tsx`](../components/gestionale/lavorazioni/lavorazioni-view.tsx): `key={createOpen ? "lav-create-open" : "lav-create-closed"}`.

## Verifica finale / regression

- Typecheck progetto: OK.
- Apertura modal in dev: OK (form iniziale pulito).
- Non modificati: API, `SchedaIngressoFields`, layout sezioni, `SchedaIngressoEditModal`, pill globali.

## Raccomandazioni manuali residue

1. Salvataggio happy path con cliente + marca reali.
2. Simulare errore sync scheda (rete/DB) e verificare modal aperto + secondo click «Salva» senza duplicare lavorazione.
3. Chiusura rapida durante `pending` e doppio submit.
