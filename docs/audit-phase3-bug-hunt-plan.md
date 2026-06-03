# FASE 3 — Bug Hunt Plan (Gestionale CAB)

Piano operativo di verifica runtime per ogni route del gestionale. Basato su [`audit-phase2-page-inventory.md`](./audit-phase2-page-inventory.md) e sullo stato post-fix audit (BUNDER DB, RBAC fail-closed, PDF inline, flush timesheet).

**Obiettivo:** trovare bug di caricamento, permessi, persistenza, sync, race condition e degradazione rete **prima** del rilascio.

**Legenda priorità:** P0 = blocco produzione · P1 = perdita dati / leak sicurezza · P2 = UX grave / drift · P3 = cosmetico

**Legenda automazione:** ✅ Playwright smoke · ⚙️ unit/regression · 📋 solo manuale

---

## Baseline runtime (2026-06-02)

| Comando | Esito | Note |
|---------|-------|------|
| `npm run smoke:regression` | **6/7 OK** | FAIL: `compat-ssot-scan.test.ts` — 2 bypass `magazzinoRowToRicambioUI` in `find-ricambio-in-list-cache.ts` |
| `npm run audit:rls` | OK | 18 tabelle service coperte |
| `npm run ci:tsc` | FAIL pre-esistente | `gestionale-section-table.ts`, `use-permissions.ts` RuoloUtente |
| Playwright smoke (11 spec) | richiede env | `SMOKE_*` credentials + `SMOKE_DOCUMENTI_LAVORAZIONE_ID` per upload |

---

## Matrice trasversale (applicare a OGNI pagina)

Per ogni scenario: **Pass** = comportamento atteso · **Fail** = apri bug con route, ruolo, browser, screenshot, console.

| # | Scenario | Pass atteso | Pagine ad alto rischio | Auto |
|---|----------|-------------|------------------------|------|
| T1 | Caricamento iniziale | Skeleton → dati; nessun flash "non autorizzato"; no React hydration error | tutte | ✅ `07-hydration-runtime` (3 route) |
| T2 | Refresh (F5) | Sessione valida; filtri sessionStorage ripristinati dove previsto | lavorazioni, documenti, preventivi, client portal | 📋 |
| T3 | Hard refresh (Ctrl+F5) | Stesso di T2; cache RQ cold; no loop redirect login | tutte | 📋 |
| T4 | Logout → login stesso utente | Cache RQ invalidata; undo session reset; notifiche admin per-user | dashboard, security | 📋 |
| T5 | Logout → login altro ruolo | Nav items coerenti; nessun dato precedente in UI | security, report, impostazioni | ⚙️ rbac-route-matrix |
| T6 | Cambio permessi live (admin) | `invalidateRuntimeTruth`; gate moduli aggiornati entro 1 refresh | security, impostazioni | 📋 |
| T7 | Perdita connessione | Banner realtime; polling 20s; UI non bloccata | lavorazioni, magazzino, bunder | 📋 |
| T8 | Riconnessione | Realtime riprende; no doppio fetch storm (<3 refetch burst) | tutte con bridge | 📋 |
| T9 | API error / timeout | Toast + retry o empty state; no white screen | dipendenti save, documenti upload, PDF | 📋 |
| T10 | Dati null / incompleti | Empty state dedicato; no crash render | dipendenti bootstrap, report integrity | 📋 |
| T11 | Record duplicati / conflict | Last-write-wins o merge visibile; no silent overwrite | bunder, timesheet, schede | 📋 |
| T12 | Race: create + navigate | Record visibile in lista dest; no 404 fantasma | lavorazioni create, preventivi | 📋 |
| T13 | Race: edit concorrente (2 tab) | Almeno uno: stale warning o refresh post-mutation | schede hub, timesheet, bunder | 📋 |
| T14 | Refetch post-mutation | Lista/detail coerenti con DB entro 2s | magazzino↔lavorazioni cross-link | ⚙️ optimistic tests |
| T15 | Realtime / broadcast | Altro tab vede update senza hard refresh | lavorazioni, promemoria, bunder | 📋 |
| T16 | RBAC timeout 8s | **Fail-closed:** blocco + reload, **non** render children | tutte con RbacPageGuard | 📋 P0 |
| T17 | Staging public slice | Nav disabilitata per moduli staging-off | preventivi, bunder, dipendenti | 📋 |
| T18 | Mobile viewport | Shell + modali scrollabili; kanban section persist | lavorazioni kanban | ✅ `06-mobile-shell`, `04-modal-scroll` |

---

## Piano ad alto rischio (P0–P1) — procedure dettagliate

### B1 — BUNDER: persistenza multi-device (P0)

**Contesto post-fix:** dati in `bunder_documents`; change log ancora localStorage.

| Step | Azione | Pass |
|------|--------|------|
| 1 | Admin: crea documento BUNDER, salva | Lista mostra nuovo record |
| 2 | Hard refresh | Record ancora presente (DB) |
| 3 | Secondo browser / incognito stesso utente | Stesso record visibile |
| 4 | Tab A: modifica titolo; Tab B: modifica note entro 5s | Almeno una versione coerente post-refetch; no crash |
| 5 | DevTools → Application → cancella solo `gestionale-bunder-*` LS | Documenti DB intatti; change log perso accettabile |
| 6 | Offline → salva → online | Toast errore o queue; no silent loss |

**Auto:** ✅ reach page (`08-bunder`) · **Gap:** create/save/cross-browser

---

### B2 — Dipendenti timesheet: save debounced (P0)

**Contesto post-fix:** flush su `beforeunload` / `pagehide`.

| Step | Azione | Pass |
|------|--------|------|
| 1 | Modifica cella ore | Indicatore saving → saved |
| 2 | Refresh entro 300ms dalla modifica | Valore persistito (flush) |
| 3 | Chiudi tab subito dopo edit | Riapri stesso mese: valore salvato |
| 4 | Simula API fail (DevTools offline) | Errore visibile; valore locale o retry |
| 5 | PDF con 0 / 1 / N dipendenti | PDF generato o messaggio empty |

**Auto:** ✅ reach page (`09-dipendenti`) · **Gap:** cell edit + flush timing

---

### B3 — Preventivi PDF multi-istanza (P1)

**Contesto post-fix:** POST `/api/preventivi/pdf-anteprima` → blob inline.

| Step | Azione | Pass |
|------|--------|------|
| 1 | Apri preventivo → Anteprima PDF | PDF in nuova tab/blob |
| 2 | Due anteprime rapid consecutive | Entrambe valide (no stale token) |
| 3 | Deploy simulato: due tab stesso preventivo | Stesso contenuto PDF |

**Auto:** ✅ reach page (`10-preventivi`) · **Gap:** PDF open assertion

---

### B4 — Lavorazioni hub schede sync (P1)

| Step | Azione | Pass |
|------|--------|------|
| 1 | Apri hub schede su lavorazione | Moduli caricati |
| 2 | Modifica scheda ingresso → salva | Hub + lista aggiornati |
| 3 | Tab 2: stessa lavorazione, modifica diverso campo | Refetch o conflict UX |
| 4 | Realtime: admin modifica da altro PC | Tab 1 aggiorna entro ~30s |

**Auto:** 📋 · **Gap E2E:** hub open + save

---

### B5 — Client portal isolation (P0)

| Step | Azione | Pass |
|------|--------|------|
| 1 | Utente `cliente` con allowlist | Solo lavorazioni consentite |
| 2 | URL diretto `/lavorazioni-clienti/{id-alien}` | 403 / redirect / empty — **no leak dati** |
| 3 | Refresh lista + detail | Filtri sessionStorage ok |
| 4 | Detail: media e documenti | Signed URL validi; no doc altri clienti |

**Auto:** ✅ admin reach list (`11-client-portal`) · **Gap:** cliente credentials + ID enumeration

---

### B6 — RBAC failsafe timeout (P0)

| Step | Azione | Pass |
|------|--------|------|
| 1 | DevTools → Network → throttle "Offline" dopo login | — |
| 2 | Naviga `/magazzino` entro 8s | **Blocco fail-closed**, non contenuto con banner warning |
| 3 | Ripristina rete → Reload | Pagina normale se permesso |

**Auto:** 📋 · **Nota:** fix implementato in `RbacPageGuard` — va verificato manualmente

---

### B7 — Security / operator deny (P1)

| Step | Azione | Pass |
|------|--------|------|
| 1 | Operatore senza `report` | `/report` → acesso-negato o dashboard |
| 2 | Operatore senza impostazioni | `/impostazioni` → deny |
| 3 | Guest non autenticato | `/impostazioni` → login |

**Auto:** ✅ parziale (`02-rbac-routes`) · **Gap:** matrix completa moduli

---

## Piano per pagina

Colonne: **Scenari** = subset T1–T18 rilevanti · **Auto** = copertura attuale

### `/dashboard`

| Scenari | Focus | Bug noti / sospetti |
|---------|-------|---------------------|
| T1,T4,T5,T15 | Promemoria CRUD + feed log; tasks LS | Tasks/log drawer solo localStorage |
| T6 | Admin cambia permessi dashboard | Promemoria write gate |

**Checklist:** promemoria create → refresh → delete; admin bell cross-tab; staging nasconde widget.

**Auto:** ✅ dashboard heading (`03-dashboard-report`)

---

### `/lavorazioni`

| Scenari | Focus | Bug noti |
|---------|-------|----------|
| T2,T7,T8,T12,T13,T14,T15 | Kanban/list, filtri SS, schede hub | Dual filter client/server; delete doppio gate |
| T18 | Mobile kanban section | sessionStorage open section |

**Checklist:** create → appare in lista; archivia → sparisce da in corso; undo log; PDF lista; deep-link `?focus=`.

**Auto:** ✅ hydration · 📋 CRUD/hub

---

### `/lavorazioni-clienti` + `/[id]`

| Scenari | Focus | Bug noti |
|---------|-------|----------|
| T2,T5,T9,T10 | Access allowlist, filtri v5 | `ClientLavorazioneDocumentsDialog` non montato su detail |
| B5 | ID enumeration | layout server vs hook desync |

**Checklist:** filtri persist; QR download; detail timeline; refresh con log cap.

**Auto:** ✅ list reach admin · 📋 cliente isolation

---

### `/preventivi`

| Scenari | Focus | Bug noti |
|---------|-------|----------|
| T2,T9,T12,B3 | Editor dynamic, PDF, draft bridge | Write usa `editWorkOrders` vs modulo |
| T11 | Concurrency `updated_at` | orphan ephemeral draft |

**Checklist:** create from lavorazioni bridge; delete; PDF anteprima; filtri sessionStorage.

**Auto:** ✅ reach · 📋 editor/PDF

---

### `/documenti`

| Scenari | Focus | Bug noti |
|---------|-------|----------|
| T2,T9 | Upload, signed URL, tree | Storage orphan; URL 3600s expiry |
| T10 | Tree vuoto | pagination vs filtri |

**Checklist:** upload → lista → open → delete; filtri avanzati refresh.

**Auto:** ✅ upload smoke (env `SMOKE_DOCUMENTI_LAVORAZIONE_ID`)

---

### `/magazzino`

| Scenari | Focus | Bug noti |
|---------|-------|----------|
| T7,T8,T13,T14 | Scorta queue, master sync 900ms | compat-ssot-scan FAIL in CI |
| T15 | Admin bell sotto-scorta | log dual-source local/server |

**Checklist:** CRUD ricambio; adjust scorta rapido x3; sotto-scorta notification; undo merge.

**Auto:** ✅ hydration · ⚙️ compat scan FAIL · 📋 CRUD

---

### `/mezzi`

| Scenari | Focus | Bug noti |
|---------|-------|----------|
| T12,T13 | Delete RPC deps | change log LS definito ma unused |
| T10 | Filtro ultima lavorazione client-only | delete deps race |

**Checklist:** create mezzo; hub detail; delete con lavorazioni collegate → messaggio deps.

**Auto:** 📋

---

### `/dipendenti`

| Scenari | Focus | Bug noti |
|---------|-------|----------|
| B2,T9,T10 | Timesheet flush, bootstrap addetti | entries error nasconde griglia |
| T6 | `dipendenti` in nav map `use-permissions` | drift SECTION_TO_MODULE |

**Checklist:** DipendenteDetailModal open/save; PDF export; empty addetti da settings.

**Auto:** ✅ reach · 📋 cell save flush

---

### `/bunder`

| Scenari | Focus | Bug noti |
|---------|-------|----------|
| B1,T11,T13 | DB sync, change log locale | no granular module permissions |
| T15 | Multi-tab | last-write-wins |

**Checklist:** wizard create; duplica; export PDF/Word; migrazione LS→DB first load.

**Auto:** ✅ reach · 📋 persistence matrix B1

---

### `/report`

| Scenari | Focus | Bug noti |
|---------|-------|----------|
| T10,T14 | Integrity badge, manual override | dual-write LS+DB magazzino manual |
| T5,T6 | Module deny report | no Realtime |

**Checklist:** compare periodi; override manuale → secondo device dopo sync DB; integrity warning.

**Auto:** ✅ report heading admin · 📋 override sync

---

### `/impostazioni`

| Scenari | Focus | Bug noti |
|---------|-------|----------|
| T4,T6,T12 | Bulk save lists, similar entity gates | unsaved changes dialog |
| T16 | Settings ready gate + RBAC | timeout chain |

**Checklist:** modifica lista → navigate away → dialog; save → refresh persist.

**Auto:** ✅ guest deny (`02-rbac-routes`) · 📋 bulk save

---

### `/dashboard/security` + `/production-readiness`

| Scenari | Focus | Bug noti |
|---------|-------|----------|
| T5,T6,B7 | User CRUD, permissions matrix | production readiness server action |
| T4 | Admin notifications per userId | — |

**Checklist:** create user validation; deny granulare modulo; toggle permesso → nav update.

**Auto:** 📋

---

### `/login` + `/acesso-negato`

| Scenari | Focus |
|---------|-------|
| T3,T4 | Login flow, rate limit, redirect `?from=` |
| B7 | 403 message + back link |

**Auto:** ✅ auth (`01-auth`)

---

## Registro bug (template)

Copiare una riga per ogni fail trovato durante l'esecuzione.

| ID | Data | Route | Scenario | Ruolo | Severità | Steps | Expected | Actual | Stato |
|----|------|-------|----------|-------|----------|-------|----------|--------|-------|
| BUG-001 | | | | | P0–P3 | | | | Open |

### Bug noti pre-hunt (da Fase 2 / baseline)

| ID | Area | Severità | Descrizione | Verifica in |
|----|------|----------|-------------|-------------|
| KN-001 | magazzino | P2 | `compat-ssot-scan` — bypass mapper in cache lookup | `npm run smoke:regression` |
| KN-002 | TSC | P2 | Errori pre-esistenti ci:tsc | build CI |
| KN-003 | dipendenti | P2 | `dipendenti` assente da nav map in `use-permissions.ts` | T6 nav hide |
| KN-004 | client portal | P2 | Documents dialog non montato su detail | B5 detail |
| KN-005 | bunder | P3 | Change log solo localStorage | B1 step 5 |
| KN-006 | mezzi | P3 | Change log key unused | code review |

---

## Roadmap automazione (post Fase 3)

Priorità implementazione Playwright oltre smoke attuale:

1. **P0:** B2 timesheet cell + flush · B5 client ID enumeration · B6 RBAC offline block
2. **P1:** B1 bunder create cross-browser · B3 PDF blob open · B4 schede hub save
3. **P2:** magazzino CRUD · mezzi delete deps · impostazioni unsaved dialog

Script suggerito: `e2e/smoke/12-rbac-offline-failclosed.spec.ts`, `13-timesheet-flush.spec.ts`, `14-bunder-persistence.spec.ts`.

---

## Esecuzione consigliata

```bash
# Baseline automatica
npm run smoke:regression
npm run audit:rls

# E2E (richiede .env.smoke)
npm run smoke:playwright

# Manuale: seguire sezioni B1–B7 e checklist per pagina
# Tempo stimato: 4–6 h full pass · 90 min smoke P0-only
```

---

## Riferimenti

- Inventario pagine: [`audit-phase2-page-inventory.md`](./audit-phase2-page-inventory.md)
- Report implementazione fix: [`technical-audit-report.md`](./technical-audit-report.md)
- Piano audit originale: fasi 4–14 ancora da produrre su richiesta
