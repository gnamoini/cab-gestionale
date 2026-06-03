# FASE 2 — Audit pagina per pagina (Gestionale CAB)

Documento operativo generato da analisi statica del codebase **post-fix audit** (migrazione BUNDER DB, RBAC fail-closed, PDF inline, dipendenti in `SECTION_TO_MODULE`, flush timesheet, report manual sync, `DipendenteDetailModal` wired).

**Legenda campi:** ogni scheda elenca funzioni, dati, API, store, hook, permessi, storage, cache, notifiche, export, upload, realtime e punti di rottura.

**Shell condivisa (tutte le route gestionale):** `GestionaleAuthGate` → `GestionaleSettingsReadyGate` → `RbacPageGuard` → view. Edge: [`proxy.ts`](proxy.ts) → [`src/middleware/proxy-handler.ts`](src/middleware/proxy-handler.ts).

---

## Indice route

| Route | View principale | Gate modulo |
|-------|-----------------|-------------|
| [`/dashboard`](#dashboard) | [`dashboard-view.tsx`](../components/dashboard/dashboard-view.tsx) | — |
| [`/lavorazioni`](#lavorazioni) | [`lavorazioni-view.tsx`](../components/gestionale/lavorazioni/lavorazioni-view.tsx) | `lavorazioni` |
| [`/lavorazioni-clienti`](#lavorazioni-clienti) | [`client-lavorazioni-view.tsx`](../components/lavorazioni-clienti/client-lavorazioni-view.tsx) | layout server |
| [`/lavorazioni-clienti/[id]`](#lavorazioni-clientiid) | [`client-lavorazione-detail-view.tsx`](../components/lavorazioni-clienti/client-lavorazione-detail-view.tsx) | layout server |
| [`/preventivi`](#preventivi) | [`preventivi-view.tsx`](../components/preventivi/preventivi-view.tsx) | `preventivi` |
| [`/documenti`](#documenti) | [`documenti-view.tsx`](../components/gestionale/documenti/documenti-view.tsx) | `documenti` |
| [`/magazzino`](#magazzino) | [`magazzino-view.tsx`](../components/gestionale/magazzino/magazzino-view.tsx) | `magazzino` |
| [`/mezzi`](#mezzi) | [`mezzi-view.tsx`](../components/gestionale/mezzi/mezzi-view.tsx) | `mezzi` |
| [`/dipendenti`](#dipendenti) | [`dipendenti-view.tsx`](../components/gestionale/dipendenti/dipendenti-view.tsx) | `dipendenti` |
| [`/bunder`](#bunder) | [`bunder-view.tsx`](../components/bunder/bunder-view.tsx) | capability only |
| [`/report`](#report) | [`report-analytics-view.tsx`](../components/report/report-analytics-view.tsx) | capability only |
| [`/impostazioni`](#impostazioni) | [`sistema-impostazioni-modal.tsx`](../components/dashboard/sistema-impostazioni-modal.tsx) | `manageSettings` |
| [`/dashboard/security`](#dashboardsecurity) | [`security-dashboard-view.tsx`](../components/dashboard/security-dashboard-view.tsx) | `manageSecurity` |
| [`/dashboard/security/production-readiness`](#dashboardsecurityproduction-readiness) | [`production-readiness-view.tsx`](../components/dashboard/security/production-readiness-view.tsx) | action server |
| [`/login`](#login) | [`login-form.tsx`](../app/login/login-form.tsx) | pubblica |
| [`/acesso-negato`](#acesso-negato) | [`acesso-negato/page.tsx`](../app/(gestionale)/acesso-negato/page.tsx) | sistema |

---

## `/dashboard`

**Funzioni:** KPI operativi, quick nav, feed log recenti, promemoria (calendario + CRUD), tasks locali, admin notifications bell, drawer log sistema (localStorage), banner staging.

**Dati:** `dashboard_promemoria`, `log_modifiche`, `lavorazioni`, `mezzi`, `magazzino_ricambi`, `movimenti_ricambi`, `scheda_lavorazione`, `app_settings`, `profiles` (join log).

**API:** client services (`lavorazioniService`, `magazzinoService`, `logService`, `dashboardPromemoriaService`, `schedeService`); nessuna route `/api/*`.

**Store / RQ:** `lavorazioniDomainQueryKeys.list`, `QK.magazzino`, `QK.log`, `SCHEde_BUNDLES_QUERY_KEY`, `QK.settings`, `["dashboard-promemoria", …]`, `QK.clientLavorazioniAccess`.

**Hook:** `useDashboardMetrics`, `useDashboardPromemoria*`, `useAdminNotificationStore`, `useLogListQuery`, `useSchedeBundlesQuery`, `useLavorazioniList`, `useGlobalOptions`, `useCabSyncListener`, `useRealtimeStatus`.

**Permessi:** sezione `dashboard`; promemoria write = `canWrite("dashboard")`; nessun `GestionaleSectionGate` modulare.

**localStorage:** `gestionale-dashboard-tasks-v1`, `gestionale-dashboard-sistema-log-v1`, `cab:admin-dashboard-notifications:{userId}`, `cab-desktop-notifications-asked`.

**sessionStorage:** —

**Cache:** VIEW 60s; feed 90s stale override; invalidazione promemoria su mutate + realtime `dashboard_promemoria`.

**Notifiche:** AdminNotificationsBell; bridge promemoria/presenze (app-level).

**Export / Upload:** —

**Realtime:** `useCabSyncListener`; bridge gestionale su tabelle operative.

**Punti di rottura:** tasks e log drawer solo localStorage; admin notifications non cross-device; staging slice nasconde widget; log drawer ≠ feed DB.

---

## `/lavorazioni`

**Funzioni:** list/kanban, filtri avanzati, CRUD inline, hub schede (dynamic), create/conclude/archive/delete, undo log, PDF lista in corso, deep-link focus.

**Dati:** `lavorazioni`, `mezzi`, `scheda_lavorazione`, `log_modifiche`, `lavorazione_documents`, `app_settings`, storage `images`/`documenti`.

**API:** `lavorazioniService`, `mezziService`, `schedeService`, `logService`; nessuna route REST lista.

**Store / RQ:** liste attive/archivio, `QK.mezzi`, schede bundles, `QK.log`, mutations lavorazioni/mezzi.

**Hook:** `useLavorazioniList`, `useSchedeBundlesQuery`, `useLavorazione*Mutation`, `usePermissions("lavorazioni")`, `useUndoableLog`, `useUIAutonomyFixEngine`.

**Permessi:** `GestionaleSectionGate module="lavorazioni"`; delete richiede `canDeleteRecords` globale.

**localStorage:** `gestionale-lavorazioni-change-log-v1`, prefs legacy.

**sessionStorage:** `gestionale-lavorazioni-advanced-filters-v1`, `lavorazioni-kanban-mobile-open-section`.

**Cache:** 30s + realtime-aware schede; `invalidateAfterLavorazioneMutations`.

**Notifiche:** toast operativi; admin bell on create (bridge).

**Export:** PDF lista in corso (client jsPDF).

**Upload:** via hub schede (immagini/documenti).

**Realtime:** pipeline gestionale + schede stale-aware.

**Punti di rottura:** dual filter client/server; schede optimistic conflict; kanban mode non persistito; permesso delete doppio gate.

---

## `/lavorazioni-clienti`

**Funzioni:** liste in corso/archivio read-only, filtri, sort, ingresso dialog, QR, link dettaglio.

**Dati:** `lavorazioni`+`mezzi`, `scheda_lavorazione`, `log_modifiche`, `app_settings` (portal access).

**API:** `fetchLavorazioniListAuthorized`, `getMyClientLavorazioniAccessAction`, layout `verifyClientLavorazioniAccessServer`.

**Store / RQ:** stesse chiavi liste ERP + `QK.clientLavorazioniAccess`, schede view layer.

**Hook:** `useClientLavorazioniAccess`, `useClientLavorazioni*Query`, `useSchedeBundlesQuery`, `useClientLavorazioniRefresh`.

**Permessi:** `lavorazioni_clienti` + allowlist `app_settings` o ruolo `cliente`; layout server fail-closed.

**localStorage:** —

**sessionStorage:** `gestionale-client-lavorazioni-filters-v5` (+ migrazione v1–v4).

**Cache:** VIEW 60s; cache condivisa con ERP (stale 30–60s).

**Notifiche:** toast refresh.

**Export:** QR PNG download.

**Upload:** —

**Realtime:** invalidazione portale via bridge globale.

**Punti di rottura:** access hook vs layout desync; stati sanitizzati portale; log cap 2000; `ClientLavorazioneDocumentsDialog` non montato su detail.

---

## `/lavorazioni-clienti/[id]`

**Funzioni:** timeline, info, media, avanzamento, QR, refresh.

**Dati:** `lavorazioni`, `log_modifiche`, schede, `lavorazione_documents`, storage immagini.

**API:** `clientLavorazioniService.getDetail`.

**Hook:** `useClientLavorazioneDetailQuery`, `useClientLavorazioneDocumentsQuery`, `useClientLavorazionePhotosQuery`.

**Permessi:** stessi portale + `ensureClientLavorazioniAccess`.

**Storage:** —

**Punti di rottura:** signed URL expiry; log cap 200; lazy photo IO race; soft-delete indistinguibile da deny.

---

## `/preventivi`

**Funzioni:** list, editor (dynamic), delete, PDF anteprima, log drawer, deep-link da lavorazioni.

**Dati:** `preventivi`, `mezzi`, `magazzino_ricambi`, `lavorazioni`, `app_settings`.

**API:** `preventiviService`; **POST** `/api/preventivi/pdf-anteprima` → PDF inline (fix multi-istanza); GET token legacy.

**Hook:** `usePreventiviRecordsQuery`, `usePermissions("preventivi")`, `preventivi-sync-adapter`.

**Permessi:** `GestionaleSectionGate module="preventivi"`; write service usa `editWorkOrders` globale.

**localStorage:** legacy entity, change log, learning keys.

**sessionStorage:** filtri avanzati, ephemeral draft bridge.

**Export:** PDF (client + POST preview).

**Punti di rottura:** concurrency `updated_at`; orphan ephemeral draft; write permission drift modulo vs capability.

---

## `/documenti`

**Funzioni:** tree marca/modello, upload, edit, delete, signed URL open.

**Dati:** `documenti` + bucket `documenti`.

**API:** `documentiService`, `uploadDocumentoBlob`, signed URL 3600s.

**Permessi:** `GestionaleSectionGate module="documenti"`; upload = `uploadDocuments`.

**localStorage:** change log, `cab-documenti-tree-pref`.

**sessionStorage:** filtri avanzati.

**Upload:** dropzone → storage → insert row.

**Punti di rottura:** storage orphan; signed URL scaduto; tree pagination vs filtri.

---

## `/magazzino`

**Funzioni:** CRUD ricambi, filtri, sotto-scorta, scorta adjust queue, master lists → settings, undo log merge, compat audit.

**Dati:** `magazzino_ricambi`, `movimenti_ricambi`, `app_settings.magazzino.master`.

**Hook:** `useMagazzinoRicambiUIQuery`, `useMagazzinoLogFeed`, `useAdminNotificationStore` (clear on mount).

**Permessi:** `GestionaleSectionGate module="magazzino"`.

**localStorage:** change log, master prefs legacy.

**sessionStorage:** filtri avanzati.

**Notifiche:** admin bell sotto-scorta (bridge).

**Punti di rottura:** scorta queue race; master sync debounce 900ms; log dual-source local/server.

---

## `/mezzi`

**Funzioni:** list server-filtered, hub detail, CRUD, delete RPC con deps, undo server log.

**Dati:** `mezzi`, lavorazioni collegate via query.

**Hook:** `useMezziListQuery`, `useMezzo*Mutation`, `useUndoableLog("mezzi")`.

**Permessi:** `GestionaleSectionGate module="mezzi"`; capability `editVehicles`.

**localStorage:** change log file definito ma **non usato** da view (dead).

**Punti di rottura:** filtro ultima lavorazione solo client; delete deps async race.

---

## `/dipendenti`

**Funzioni:** griglia timesheet, editor cella, **DipendenteDetailModal** (wired), bootstrap registry, PDF export.

**Dati:** `dipendenti_timesheet_employees`, `dipendenti_timesheet_entries`, addetti/tipi assenza da `app_settings`.

**Hook:** `useDipendentiTimesheet` (**flush beforeunload/pagehide**), `usePermissions("dipendenti")`.

**Permessi:** `GestionaleSectionGate module="dipendenti"`; `dipendenti` in `SECTION_TO_MODULE` (route + guards).

**Storage:** —

**Export:** PDF complessivo/per dipendente.

**Punti di rottura:** addetti non da settings → empty states; entries error nasconde griglia.

---

## `/bunder`

**Funzioni:** list, wizard, editor (dynamic), duplica, delete, PDF/Word export, log drawer locale.

**Dati (post-fix):** **`bunder_documents`** Supabase (payload JSONB); migrazione auto da localStorage.

**API:** `bunderService`, `bunder-sync-adapter`, migration [`20260704120000_bunder_documents.sql`](../supabase/migrations/20260704120000_bunder_documents.sql).

**Hook:** **`useBunderDocumentsQuery`**.

**Permessi:** sezione `bunder` capability-only; **non** in `GESTIONALE_PERMISSION_MODULES`.

**localStorage:** flag migrazione; change log ancora locale.

**Cache:** `BUNDER_QUERY_KEY`; invalidate via sync dispatch.

**Punti di rottura:** change log solo device; no granular module permissions; last-write-wins multi-tab.

---

## `/report`

**Funzioni:** zone analytics, compare periodi, integrity badge, override magazzino manuali, manual entries lavorazioni.

**Dati:** lavorazioni, magazzino, mezzi, movimenti, `report_manual_entries`, **`app_settings` report.magazzino_manual_month_map_v1** (post-fix sync).

**Hook:** `useReportLiveData`, multi domain queries.

**Permessi:** modulo `report` in truth layer.

**localStorage:** override cache + flag migrazione DB.

**Cache:** derived bundle in-memory; broadcast in-app refresh.

**Punti di rottura:** dual-write LS+DB; partial fetch integrity warning; no Realtime.

---

## `/impostazioni`

**Funzioni:** bulk settings, rename propagation, hierarchy trees, migrazione preventivi LS→DB (admin).

**Dati:** `app_settings` SSOT.

**Permessi:** `canManageSettings`; operatore ha capability in production.

**Punti di rottura:** bulk version conflict; rename propagation parziale; preventivi legacy count da LS.

---

## `/dashboard/security`

**Funzioni:** user CRUD, permissions matrix, auth logs, release control, pilot toggle, reset log globale.

**Dati:** `profiles`, `user_permissions`, `auth_logs`, `log_modifiche`, `app_settings`.

**Realtime:** channel `security-release-control-center` su `app_settings`.

**Permessi:** `manageSecurity` only.

**Punti di rottura:** non-admin vede card statica vs redirect; realtime storm su settings.

---

## `/dashboard/security/production-readiness`

**Funzioni:** run production readiness check, display blockers/warnings.

**API:** `runProductionReadinessCheckAction` (server).

**Permessi:** `manageSecurity` su action.

**Punti di rottura:** DB non checked in locale; no cache risultati.

---

## `/login`

**Funzioni:** signIn email/username, remember me, forgot password modal, post-login redirect per ruolo.

**API:** Supabase Auth; `resolveLoginEmailAction` con validazione identifier.

**Permessi:** pubblica.

**Punti di rottura:** redirect race con client portal access loading.

---

## `/acesso-negato`

**Funzioni:** messaggio 403, link back via `?from=`.

**Permessi:** `RbacPageGuard` pass-through; redirect target da guard.

**Punti di rottura:** doppia UX (panel inline vs pagina dedicata durante transizione).

---

## Cross-cutting (Fase 2)

### Matrice permessi moduli

| Modulo | `GESTIONALE_PERMISSION_MODULES` | `SECTION_TO_MODULE` route | `SECTION_TO_MODULE` nav hook |
|--------|--------------------------------|-----------------------------|------------------------------|
| lavorazioni | ✓ | ✓ | ✓ |
| preventivi | ✓ | ✓ | ✓ |
| documenti | ✓ | ✓ | ✓ |
| magazzino | ✓ | ✓ | ✓ |
| mezzi | ✓ | ✓ | ✓ |
| report | ✓ | ✓ | ✓ |
| dipendenti | ✓ | ✓ | **drift:** assente in `use-permissions.ts` nav map |
| bunder | ✗ | ✗ | ✗ |

### Chiavi storage globali (riferimento)

Vedi [`docs/technical-audit-report.md`](technical-audit-report.md) e audit Fase 5 nel piano originale.

### Prossima fase

**Fase 3 — Bug Hunt Plan:** per ogni scheda sopra, eseguire matrice test (refresh, logout, permessi, offline, race) documentata nel piano audit; tracciare esiti in issue tracker.

---

*Generato: audit statico codebase. Verifica runtime: `npm run smoke:playwright`, navigazione manuale per pagina.*
