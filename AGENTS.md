# [AGENTS.md](http://AGENTS.md)

## Mission

Questo progetto è un gestionale aziendale utilizzato per la gestione di:

- clienti
- mezzi
- dipendenti
- interventi
- preventivi
- reportistica
- notifiche
- configurazione
- sicurezza
- documentazione PDF

Ogni modifica deve privilegiare:

1. affidabilità
2. stabilità
3. integrità dei dati
4. coerenza UX/UI
5. mantenibilità
6. sicurezza

---

# Regola Fondamentale

Prima di modificare qualsiasi file:

1. Comprendere il problema.
2. Analizzare il flusso completo coinvolto.
3. Individuare dipendenze e impatti.
4. Valutare effetti collaterali.
5. Solo successivamente proporre modifiche.

Mai modificare codice "a tentativi".

---

# Modalità Operativa

Per ogni richiesta seguire sempre:

## Fase 1 - Analisi

Identificare:

- componenti coinvolti
- pagine coinvolte
- hook coinvolti
- store coinvolti
- API coinvolte
- permessi coinvolti
- dati coinvolti
- PDF coinvolti
- notifiche coinvolte

Produrre un'analisi preliminare.

---

## Fase 2 - Impatto

Valutare:

- regressioni possibili
- effetti collaterali
- problemi di permessi
- problemi responsive
- problemi mobile
- problemi performance
- problemi sicurezza

---

## Fase 3 - Implementazione

Modificare esclusivamente ciò che è necessario.

Evitare:

- refactor non richiesti
- rinominazioni inutili
- spostamenti inutili
- cambi architetturali non richiesti

---

## Fase 4 - Verifica

Controllare:

- build
- lint
- type safety
- permessi
- responsive
- caricamento dati
- salvataggi
- refetch
- notifiche
- PDF

---

# Divieti Assoluti

Non fare mai automaticamente:

- refactor globali
- rinominazioni massive
- modifiche API
- modifiche schema database
- modifiche permessi
- modifiche routing
- modifiche storage
- modifiche localStorage
- modifiche PDF

senza esplicita richiesta.

---

# Gestione Permessi (RBAC)

Qualsiasi modifica che coinvolga:

- utenti
- ruoli
- sicurezza
- visibilità dati
- sidebar
- route

deve essere trattata come modifica critica.

Verificare sempre:

- accesso UI
- accesso route diretto
- accesso dati
- filtri
- export
- PDF

Mai affidarsi esclusivamente alla UI.

---

# Gestione Dati

Mai assumere che un dato esista.

Verificare sempre:

- undefined
- null
- array vuoti
- oggetti incompleti
- dati legacy

Ogni nuova funzione deve gestire:

- empty state
- loading state
- error state

---

# Standard UI

Qualsiasi nuova interfaccia deve:

- rispettare il design system esistente
- utilizzare componenti già presenti
- mantenere coerenza visiva globale
- mantenere spacing coerente
- mantenere gerarchia visiva coerente

Evitare design isolati.

---

# Standard Responsive

Ogni modifica deve essere verificata per:

## Desktop

- 1920px
- 1440px
- 1366px

## Tablet

- portrait
- landscape

## Mobile

- Android
- iPhone

Verificare:

- overflow
- contenuti tagliati
- modali
- dropdown
- tastiera virtuale

---

# Standard Form

Per ogni campo:

Verificare:

- focus
- blur
- validazione
- accessibilità
- mobile usability

Dropdown e autocomplete devono:

- restare ancorati al campo
- non coprire tutta la pagina
- funzionare con tastiera virtuale

---

# Standard Modal

Ogni modal deve supportare:

- apertura corretta
- chiusura tramite X
- chiusura tramite ESC
- focus trap
- responsive

Mai lasciare overlay o listener residui.

---

# Standard Tabelle

Verificare sempre:

- ordinamento
- filtri
- ricerca
- paginazione
- responsive

Le tabelle devono funzionare anche con:

- 0 record
- 1 record
- migliaia di record

---

# Standard PDF

Prima di modificare PDF:

Analizzare:

- template
- route
- dati utilizzati
- permessi

I PDF devono utilizzare solo dati realmente disponibili.

Mai introdurre campi inventati.

---

# Standard Skeleton Loader

I loader devono:

- rappresentare il contenitore finale
- non simulare dettagli interni
- evitare layout shift

Non mostrare contemporaneamente:

- spinner
- skeleton
- progress bar

per lo stesso caricamento.

---

# Standard Notifiche

Ogni notifica deve verificare:

- creazione
- persistenza
- lettura
- eliminazione
- permessi

Mai generare notifiche duplicate.

---

# Standard Log Modifiche

Ogni log deve contenere:

- chi
- quando
- cosa
- entità
- valore precedente
- valore nuovo

Verificare sempre la tracciabilità.

---

# Sicurezza

Per ogni modifica verificare:

## Input

- validazione
- sanitizzazione

## Accesso

- autenticazione
- autorizzazione

## Dati

- visibilità
- esposizione

## URL

- accessi diretti
- manipolazione parametri

**URL pubblici (SSOT):** è vietato costruire URL pubblici utilizzando `request.url.origin` direttamente. Tutti gli URL pubblici (QR, email, webhook, notifiche, export PDF, deep link) devono usare esclusivamente `resolveCanonicalSiteOrigin()` da [`lib/core/site-origin.ts`](../lib/core/site-origin.ts).

---

# Audit Richiesti Prima del Merge

Per modifiche significative eseguire:

## Functional Audit

- flusso completo

## RBAC Audit

- permessi

## Mobile Audit

- responsive

## Data Audit

- integrità dati

## Regression Audit

- funzionalità esistenti

---

# Output Obbligatorio

Prima di ogni modifica rilevante fornire:

## Analisi

- file coinvolti
- impatto
- rischi

## Implementazione

- modifiche previste

## Verifica

- controlli effettuati

## Rischi Residui

- eventuali criticità

---

# Filosofia del Progetto

Preferire sempre:

- semplicità
- prevedibilità
- stabilità
- sicurezza
- manutenzione futura

Evitare:

- complessità non necessaria
- ottimizzazioni premature
- refactor non richiesti
- cambiamenti architetturali senza motivazione

L'obiettivo non è scrivere il codice più sofisticato possibile.

L'obiettivo è mantenere un gestionale affidabile, sicuro, coerente e facilmente manutenibile nel tempo.

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.



## Modali gestionale (dimensioni SSOT)

- SSOT: `lib/ui/modal-size-system.ts` — `modalSize` semantico (`confirmation`, `info`, `formSmall`, `formMedium`, `formLarge`, `analytics`, `fullscreen`).
- Shell: `GestionaleModalShell` con prop `modalSize` / `modalHeight`; conferme: `GestionaleConfirmDialog` (larghezza `confirmation`).
- Drawer: `resolveDrawerAsideClasses("drawerLog" | "drawerFilter" | "drawerNav")`.
- Documentazione: `docs/modal-system.md`. Audit: `lib/regression/modal-width-audit.test.ts`.
- Input numerici: `docs/ui/numeric-input-contract.md`. Audit: `lib/regression/numeric-input-anti-patterns.test.ts`.

## Tabelle gestionale (design master)

La tabella della pagina **Lavorazioni** è il riferimento unico per tutte le liste dense.

- Shell: `GestionaleListTable` da `@/components/gestionale/global-table`
- Token: `@/lib/ui/gestionale-list-table` (`gestionaleListTableTd`, `gestionaleListTableRowClass`, colonna Azioni, …)
- Header sort: `GlobalTableSortTh` — titoli su **una riga** (`whitespace-nowrap`)
- Colonna Azioni: `GestionaleListTableActionsHead` + `gestionaleListTableTdAzioni` + `gestionaleListTableActionsGroup`

Non introdurre classi tabella locali (`prevTableTd`, thead custom, `text-sm` sulla table) salvo eccezioni documentate.

## Dev server (Turbopack / proxy)

- Default: `npm run dev` (Turbopack). `next.config.ts` imposta `turbopack.root` al progetto per evitare root inference errata.
- Se HMR crash su `proxy.ts` / `proxy-handler.ts` (`NextSegmentConfig no longer exists`): usare `**npm run dev:webpack`** temporaneamente mentre si lavora sull'edge auth/RBAC — non disabilitare Turbopack in modo permanente senza motivo.
- `proxy.ts`: `config.matcher` deve restare **string literal** (no `String.raw` / builder dinamici).

## Security DEFINER (RPC allowlist)

- SSOT grant policy: `docs/security/rpc-access-manifest.json` — ogni `SECURITY DEFINER` deve avere una entry; assente = nessun EXECUTE client.
- Regola: `SECURITY DEFINER + EXECUTE anon = DENY` (salvo `anonAllow: true` esplicito nel manifest; atteso: zero).
- Ogni nuova migration con `SECURITY DEFINER` nello stesso PR: `REVOKE` + `GRANT` espliciti + entry manifest + gate `security-migration-gate.test.ts`.
- Baseline: `scripts/export-security-catalog-baseline.ts`; diff: `scripts/diff-security-baseline.ts`.

## Control Plane (governance layer)

- SSOT governance: [`docs/control-plane/README.md`](docs/control-plane/README.md)
- ADR: [`docs/adr/ADR-001-control-plane-architecture.md`](docs/adr/ADR-001-control-plane-architecture.md)
- Implementazione: `lib/control/` (registry, catalog, executor)
- Tier: `npm run control:{local,pr,staging,cert,production,observe}`
- Legacy CI: `release-gate` workflow (alias in transizione verso `control:pr`)
- Nuovo controllo: seguire processo in README — `governance.control.review` deve passare

# Caveman Mode

- minimal output
- no filler words
- fragment sentences preferred
- preserve technical correctness