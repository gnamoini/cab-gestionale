# Production Readiness Audit — Gestionale CAB

**Data:** 2026-06-04  
**Aggiornamento remediations:** 2026-06-04 — RBAC guest, flex baseline v6, smoke:regression verde (locale)  
**Scope:** Valutazione readiness per utenti reali (dipendenti, responsabili, clienti esterni)  
**Metodo:** Consolidamento 32 audit `docs/audit-phase*.md`, gate CI, scansione codice, esecuzione locale comandi gate  
**Autorità release:** workflow GitHub [`release-gate`](../.github/workflows/release-gate.yml) (non Vercel build)

**Documenti correlati:** [RELEASE_READINESS_AUDIT.md](./RELEASE_READINESS_AUDIT.md) · [OPERATIONAL_READINESS_AUDIT.md](./OPERATIONAL_READINESS_AUDIT.md) · [PLATFORM_STATUS_REPORT.md](./PLATFORM_STATUS_REPORT.md) · [audit-phase7-security-audit.md](./audit-phase7-security-audit.md) · [audit-phase5-storage-audit.md](./audit-phase5-storage-audit.md)

---

## Executive Summary

Il gestionale CAB è **architetturalmente maturo** per un ERP interno: RBAC a più livelli, RLS Postgres come backstop, gate CI estesi (`ci:tsc`, build, UX, `production:check`, regression tsx, flex, Playwright), truth layer per permessi e invalidazione React Query coalesced.

**Non è ancora pronto per un “rilascio definitivo” senza condizioni** verso **clienti esterni** e **tenant ad alto volume**: restano drift RBAC guest (TS vs DB), hardening portal cross-tenant parziale, fallback localStorage business se env disattivati, assenza APM esterno, performance liste senza virtualizzazione, e dipendenza da secrets CI/DB non verificabili in questa passata locale.

| Pubblico | Verdetto | Condizioni |
|----------|----------|------------|
| **Personale interno** (operatore, manager, admin) | **GO condizionato** | `release-gate` verde; secrets Supabase; migration applicate; fix CI in working tree pushati |
| **Clienti esterni** (portale) | **NO-GO** | Completare S13 (cross-tenant RLS + E2E); smoke portal obbligatorio |
| **Uso mobile sul campo** | **GO condizionato** | `ux:mobile-gate` verde; validazione manuale iOS Safari |

### Gate eseguiti in questa sessione (locale, 2026-06-04)

| Comando | Esito | Note |
|---------|-------|------|
| `npm run ci:tsc` | **PASS** | 0 blockers |
| `npm run production:check` | **PASS** (codice) | DB skipped — mancano `SUPABASE_*` locali |
| `npm run audit:rls` | **PASS** | 18 tabelle services coperte da RLS in migration |
| `npm run smoke:structural` | **PASS** | |
| `npm run smoke:regression` | **PASS** | Dopo baseline flex v6 + `min-w-0` containment su 2 componenti |
| `npm run flex:eslint:gate` | **PASS** | 0 nuove violazioni flex |
| `npm run flex:freeze:gate` | **PASS** | 1 stale baseline entry (warning) |
| `npm run ux:mobile-gate` | **PASS** | 14 warnings euristici; score euristico 40 |

**Implicazione CI:** finché `smoke:regression` include il test freeze con conteggio disallineato, **`release-gate` può fallire** dopo `production:check` anche con codice funzionante. Azione: `npm run flex:baseline:generate` (con approvazione) o aggiornare `.eslint-flex-baseline.json` entry count.

---

## FASE 1 — Production Readiness Score (0–10)

| Area | Score | Motivazione |
|------|-------|-------------|
| **Security** | **7.5** | RLS + server actions (`assertAdminCaller`); validazione security actions; rate limit login. Gap: guest drift, portal S13 parziale, login email resolve, no Sentry/APM |
| **RBAC** | **7.5** | Allineato guest TS/DB (`can_read_operational: false`); test route matrix aggiornati. Gap residuo: write guards role-only, portal S13 |
| **Data Integrity** | **7.5** | Truth layer, invalidate batch 100ms, undo session, log batcher, timesheet flush. Gap: LS fallback preventivi/schede |
| **Storage Management** | **8.0** | Bucket `documenti` privato, signed URL, scan blocca URL pubblici in prod code |
| **Error Handling** | **7.0** | `formatSupabaseError`, permission toasts, error boundaries. Gap: settings gate degrada; no reporting esterno |
| **Performance** | **6.5** | Paginazione client ~100 righe; lazy modals. Gap: no virtualization; PDF main-thread |
| **Scalability** | **6.5** | Realtime + polling 20s; 18 tabelle. Gap: liste full in-memory |
| **Maintainability** | **8.0** | 67+ regression tests, design system lock, docs ops. Gap: ~80 `@deprecated`; dev mounts in app-shell |
| **Mobile Readiness** | **7.0** | `ux:mobile-gate` in CI; spec 04/06/12 @ 390×844. Gap: report/preventivi/portal non in smoke mobile |
| **Operational Readiness** | **8.0** | Gate-first, checklist, `ops:diagnostics`. Dipende da secrets GitHub |
| **User Experience** | **7.5** | DS unificato; notifiche desktop. Gap: tabelle dense su mobile reale |
| **Production Readiness complessiva** | **7.4** | Media pesata aree sopra (post-remediation locale) |

### Remediation applicate (2026-06-04)

| ID | Fix |
|----|-----|
| RBAC-01 | `lib/rbac.ts` guest `can_read_operational: false`; `supabase/rbac_core.sql` allineato; test matrix |
| CI flex | `.eslint-flex-baseline.json` v6 (16 entry); `admin-notifications-bell` già con `min-w-0` |
| CI scan | `production-readiness-scan.ts` allowlist test RBAC/storage (working tree) |
| LS prod | `.env.production.example`: `NEXT_PUBLIC_PREVENTIVI_DB_PRIMARY=true` + nota schede |
| Overflow | `dashboard-promemoria-scope-dialog`, `client-lavorazione-detail-view` `min-w-0` |

---

## FASE 2 — RBAC Audit

### Ruoli

| Ruolo | Operational read | Operational write | Settings | Security | Client area |
|-------|------------------|-------------------|----------|----------|-------------|
| admin | sì | sì | sì | sì | sì |
| manager | sì | sì | sì | no | sì |
| operatore | sì | sì | sì | no | sì |
| cliente | no | no | no | no | sì |
| guest | **sì (TS)** | no | no | no | no |

**Fonte TS:** [`lib/rbac.ts`](../lib/rbac.ts) `ROLE_CAPABILITIES` L56–91.  
**Fonte DB:** migration `20260605120000_operatore_can_manage_settings_default.sql` — `can_read_operational` solo manager/operatore (guest escluso).

### Matrice route × ruolo (capability + test CI)

Path → sezione: [`pathnameToSection`](../lib/auth/rbac.ts) L169–186. Valutazione: [`evaluateGestionaleRouteAccess`](../src/lib/auth/evaluate-gestionale-route-access.ts) + test [`rbac-route-matrix.test.ts`](../lib/regression/rbac-route-matrix.test.ts).

| Route | admin | manager | operatore | cliente | guest |
|-------|-------|---------|-----------|---------|-------|
| `/dashboard` | sì | sì* | sì* | no | sì† |
| `/lavorazioni` | sì | sì* | sì* | no | sì† |
| `/preventivi` | sì | sì* | sì* | no | sì† |
| `/documenti` | sì | sì* | sì* | no | sì† |
| `/magazzino` | sì | sì* | sì* | no | sì† |
| `/mezzi` | sì | sì* | sì* | no | no |
| `/bunder` | sì | sì* | sì* | no | sì† |
| `/report` | sì | sì* | sì* | no | sì† |
| `/dipendenti` | sì | sì* | sì* | no | sì† |
| `/impostazioni` | sì | sì | sì | no | no |
| `/dashboard/security` | sì | no | no | no | no |
| `/lavorazioni-clienti` | sì‡ | sì‡ | sì‡ | sì | no |
| `/lavorazioni-clienti/[id]` | sì‡ | sì‡ | sì‡ | sì | no |
| `/login`, `/acesso-negato` | libero | libero | libero | libero | libero |

\* Con `user_permissions` granulari, modulo negato → negato via `canAccessRoute` + snapshot.  
† **Drift:** guest ha `can_read_operational: true` in TS → test L50–57 ammette `/dashboard`; RLS DB può negare dati.  
‡ Staff: `can_read_operational` + `clientLavorazioniAllowed` da impostazioni portal.

### Layer di protezione

| Layer | File | Bypassabile? |
|-------|------|--------------|
| Edge proxy | [`src/middleware/proxy-handler.ts`](../src/middleware/proxy-handler.ts) | No (redirect) |
| RSC layout | es. [`app/(gestionale)/dashboard/security/layout.tsx`](../app/(gestionale)/dashboard/security/layout.tsx) | No |
| Auth / settings / RBAC guard | [`rbac-page-guard.tsx`](../components/gestionale/rbac-page-guard.tsx) | Sì (DevTools) |
| Section gate | [`gestionale-section-gate.tsx`](../components/gestionale/gestionale-section-gate.tsx) | Sì |
| Client services | [`permission-guards.ts`](../src/lib/auth/permission-guards.ts) | Sì |
| Server actions | `assertAdminCaller`, `verifyServerPermission` | No |
| RLS | `rbac_has_capability`, `user_effective_can` | **Autoritativo** |

### Escalation e problemi RBAC

| ID | Gravità | Problema | File / evidenza | Impatto | Soluzione |
|----|---------|----------|-----------------|---------|-----------|
| RBAC-01 | **Alta** | Guest read TS ≠ DB | `lib/rbac.ts` L86; migration SQL | UI mostra moduli; query falliscono | `guest.can_read_operational: false`; allineare `supabase/rbac_core.sql` |
| RBAC-02 | **Alta** | Portal cross-tenant (S13) | `audit-phase7` L43; layout `lavorazioni-clienti` | Cliente vede dati altri se RLS gap | E2E 2 `cliente_ref`; review policy `lavorazioni_clienti` |
| RBAC-03 | **Media** | Write `ensurePermission` vs modulo | Pattern `src/services/*.service.ts` | UI write con modulo negato | `ensureSectionWrite` su mutazioni |
| RBAC-04 | **Media** | Operatore `can_manage_settings` | `lib/rbac.ts` L74; policy test L17 | Superficie impostazioni ampia | Policy business documentata o capability ristretta |
| RBAC-05 | **Media** | PDF preview fallback coarse | [`lib/pdf/pdf-preview-handler.ts`](../lib/pdf/pdf-preview-handler.ts) L41–48 | Guest TS passa check secondario | Allineare guest + module check |
| RBAC-06 | **Bassa** | Security UI `isAdmin` | `security-dashboard-view.tsx` ~L392 | Fragile con nuovi ruoli | Usare `manageSecurity` ovunque |

---

## FASE 3 — Storage Audit

**Riferimento completo:** [audit-phase5-storage-audit.md](./audit-phase5-storage-audit.md).

### Sintesi

| Layer | Chiavi / pattern | Rischio produzione |
|-------|------------------|-------------------|
| **localStorage** | 27 chiavi (prefs, change-log, legacy preventivi/schede, notifiche) | **ALTO** se `NEXT_PUBLIC_PREVENTIVI_DB_PRIMARY` / schede local primary disattivati |
| **sessionStorage** | Filtri avanzati, undo session, runtime settings, preventivi bridge | MEDIO — persi tra tab/device |
| **IndexedDB** | Assente | — |
| **React Query** | Layer CORE/VIEW/REPORT; invalidate realtime | BASSO — ben governato |
| **Cookie** | Supabase session httpOnly | BASSO |

### Chiavi ad alto impatto (business)

| Chiave | File | Rischio | Logout cleared? |
|--------|------|---------|-----------------|
| `gestionale-preventivi-v1` | `lib/preventivi/preventivi-storage.ts` | Duplicato vs DB | No |
| `gestionale-lavorazioni-schede-v1` | `lib/schede/lavorazioni-schede-storage.ts` | Merge inconsistente | No |
| `cab:admin-dashboard-notifications:{userId}` | `lib/lavorazioni/admin-notification-store.ts` | Solo device | No |

### Cache / invalidazione

- Realtime: [`gestionale-realtime-bridge.tsx`](../src/components/gestionale-realtime-bridge.tsx) → `invalidate-targets` + batch 100ms
- Permessi: `staleTime: Infinity` + invalidazione truth layer
- **Rischio:** dati obsoleti se realtime down → polling 20s (accettato, documentato)

---

## FASE 4 — Legacy Audit

| Elemento | Path | Motivo | Rischio | Rimozione |
|----------|------|--------|---------|-----------|
| Route `/supporto` | rimossa | Deprecata migration | Basso | Solo DB/docs |
| API PDF legacy | `app/api/preventivi/pdf-anteprima/route.ts` | 410 Gone | Medio | Dopo periodo deprecazione |
| API PDF attiva | `app/api/pdf/preview/route.ts` | SSOT | — | Mantieni |
| LS preventivi/schede | `lib/preventivi/preventivi-storage.ts` | Migrazione storica | **Alto** in prod senza flag | Env DB-primary obbligatorio |
| Dead export | `components/lavorazioni-clienti/client-lavorazione-documents.tsx` | Non importato | Basso | Rimuovi o collega |
| Dev mounts | `app-shell.tsx` → linter/UI-OS | Solo dev | Basso | `NODE_ENV` guard |
| `compat-dev-tools` | `lib/magazzino/compat/compat-dev-tools.ts` | Debug window | Basso | Disabilita prod |
| TODO/FIXME in sorgente | — | 0 match | — | — |
| `console.log` UI | Assente in `components/` runtime | — | — | — |

---

## FASE 5 — URL e Routing Audit

### Route applicative (`app/**/page.tsx`)

| Path | Sezione RBAC | Server guard | Smoke E2E |
|------|--------------|--------------|-------------|
| `/` | redirect | — | — |
| `/login`, `/login/reset-password` | pubblico | — | `01-auth` |
| `/acesso-negato` | pubblico | — | — |
| `/dashboard` | dashboard | layout gestionale | `03-dashboard`, `06-mobile` |
| `/dashboard/security` | security | `verifyServerPermission` layout | — |
| `/dashboard/security/production-readiness` | security | idem | — |
| `/lavorazioni` | lavorazioni | proxy + guards | `02`, `12-mobile` |
| `/lavorazioni-clienti`, `/[id]` | portal | layout scope `cliente_ref` | `11-client-portal` |
| `/preventivi` | preventivi | proxy | staging block |
| `/documenti` | documenti | proxy | staging block |
| `/magazzino` | magazzino | proxy | `12-mobile` |
| `/mezzi` | mezzi | proxy | — |
| `/bunder` | bunder | proxy | `08` |
| `/report` | report | proxy | staging block |
| `/dipendenti` | dipendenti | proxy | `09`, `12-mobile` |
| `/impostazioni` | impostazioni | proxy + pilot DB | — |

### API routes

| Path | Stato | Auth |
|------|-------|------|
| `/api/pdf/preview` | **Attiva** | `verifyServerModuleCan` + rate limit |
| `/api/preventivi/pdf-anteprima` | **Legacy 410** | Deprecata |

### Redirect e anomalie

- Staging: [`staging-public.ts`](../lib/env/staging-public.ts) → `/dashboard?staging_unavailable=1`
- Cliente: home [`CLIENTE_HOME_PATH`](../lib/auth/rbac.ts) `/lavorazioni-clienti`
- **Naming:** `acesso-negato` (PT) vs resto IT — coerenza storica, non blocca produzione

---

## FASE 6 — Pilot / Real-world Readiness

| Scenario | Ready? | Note |
|----------|--------|------|
| Uso interno giornaliero | **Sì, condizionato** | Training errori RLS; backup Supabase manuale |
| Multiutente concorrente | **Medio** | Realtime + conflitti edit non OT |
| Clienti esterni | **No** | RBAC-02, test insufficienti |
| Mobile campo | **Medio** | Gate static OK; Safari reale fuori CI |
| Uso 8h+/giorno | **Medio-alto** | Session refresh; degradation detector |

**Punti critici operativi:** perdita dati solo se LS-primary senza sync DB; notifiche admin solo su device; undo solo per session tab.

---

## FASE 7 — Error Handling

| Categoria | Implementazione | Gap |
|-----------|-----------------|-----|
| API Supabase | `formatSupabaseError`, `isPermissionDeniedError` | Messaggi generici su errori rari |
| Timeout / offline | Realtime reconnect + polling; banner session degraded | No queue offline write |
| Null / missing | Guard UI + empty states moduli | Alcune view senza skeleton uniforme |
| Auth errors | Redirect login / accesso negato | — |
| Upload documenti | Storage error mapping | Smoke opzionale con seed ID |
| Export / PDF | Handler dedicato; size cap 15MB | Main-thread freeze PDF grandi |
| UX recupero | Toast gestionale; undo device | No retry automatico mutazioni |

**Resilienza:** error boundaries [`gestionale-client-error-boundary.tsx`](../components/observability/gestionale-client-error-boundary.tsx); fail-closed RBAC 8s.

---

## FASE 8 — Data Integrity

| Meccanismo | Stato | File |
|------------|-------|------|
| CRUD + RLS | Autoritativo | services + Supabase |
| Refetch / stale policies | Per layer | `query-layer-policies.ts` |
| Realtime invalidation | Debounced | `invalidate-batch.ts` |
| Undo device | sessionStorage + LS change-log | `undo-session.ts` |
| Log modifiche batcher | Presente | log batcher module |
| Timesheet flush | beforeunload | audit-phase9 |
| Rollback DB | Manuale / Supabase backup | Non in app |

**Rischi:** duplicazione preventivi LS+DB; conflitti edit simultanei non merged; BUNDER change-log solo LS.

---

## FASE 9 — Security Audit (priorità)

| Rischio | Sev | Mitigazione attuale |
|---------|-----|---------------------|
| Bypass client → RLS | Alta se RLS gap | `audit:rls` PASS |
| Guest drift | Alta | RBAC-01 |
| Portal cross-tenant | Alta | Layout + RLS; test parziale |
| Login enumeration | Media | `resolve-login-email` rate limit |
| XSS stored | Media | React default + input audit doc |
| CSV/PDF injection | Media | PDF handler; export review |
| CSRF API | Basso | Cookie SameSite; poche API |
| Service role leak | Critica se esposta | Solo server; blocked su Vercel prod env |
| Stored secrets in LS | Basso | Auth in cookie, non LS |

**Lista prioritaria:** RBAC-01 → RBAC-02 → secrets CI → flex baseline smoke → guest PDF path → operatore settings policy.

---

## FASE 10 — Deployment Readiness

| Aspetto | Stato |
|---------|-------|
| Env template | `.env.production.example`, `.env.smoke.example` |
| Vercel | Build only; no service role |
| CI authority | `release-gate` 8+ step |
| Branch protection | Config esterna (richiesta) |
| Migration pending | 3 citate in audit-phase14 — verificare su staging/prod |
| Logging | Console JSON; `NEXT_PUBLIC_OBS_*` |
| Monitoring | Nessun SaaS APM; health bridge dev/ops warn |
| Fix non pushati | `production-readiness-scan` allowlist, `admin-notifications-bell` flex |

**Rischio deploy:** merge senza secrets → `production:check` FAIL DB in CI (come visto in Actions screenshot utente).

---

## FASE 11 — Performance Readiness

| Area | Collo di bottiglia | Severità |
|------|-------------------|----------|
| Lavorazioni lista/kanban | Full list in RAM | Medio-alto >500 righe |
| Magazzino | Full list | Medio |
| Dashboard | Molti widget + KPI | Medio |
| Report | Lazy analytics; REPORT stale 120s | Basso |
| PDF | jsPDF main thread | Medio |
| Dipendenti grid | DOM grande | Medio |
| Realtime storm | 18 tabelle invalidate | Medio su reconnect |

**Raccomandazione:** profiling con dataset produzione; virtualizzazione P2.

---

## FASE 12 — Mobile Readiness

| Check | Esito |
|-------|-------|
| `ux:mobile-gate` CI | PASS (warnings) |
| Playwright 390×844 | dashboard, lavorazioni, magazzino, dipendenti |
| `ios:check` | Non in release-gate — manuale |
| Modali / safe-area | `mobile-modal-behavior.ts` |
| Tabelle | Scroll orizzontale; no card-first |

**Gap:** `/report`, `/preventivi`, portale cliente non in smoke mobile.

---

## Problemi per severità

### Critici

- Nessuno bloccante **nel codice applicativo** se RLS applicato e env production corretti.
- **CI/config:** assenza secrets Supabase in GitHub → `production:check` FAIL (exit 1).

### Alti

| ID | Descrizione |
|----|-------------|
| H1 | RBAC-01 guest drift TS/DB |
| H2 | RBAC-02 client portal cross-tenant |
| H3 | `smoke:regression` FAIL baseline flex count (16 vs 17) |
| H4 | LS business fallback se env DB-primary off |
| H5 | CI Playwright senza `SMOKE_*` |

### Medi

| ID | Descrizione |
|----|-------------|
| M1 | Write guards vs `user_permissions` |
| M2 | Performance liste senza virtualization |
| M3 | No external APM |
| M4 | Operatore `can_manage_settings` |
| M5 | Mobile E2E route coverage limitata |
| M6 | Realtime polling fallback 20s |

### Bassi

| ID | Descrizione |
|----|-------------|
| L1 | Dead export client-lavorazione-documents |
| L2 | API PDF legacy route |
| L3 | Dev audit mounts in app-shell |
| L4 | `acesso-negato` naming |

---

## Piano di correzione prioritizzato

### P0 — Prima del prossimo deploy production

1. Configurare secrets GitHub: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `SMOKE_ADMIN_*`
2. Push fix: `production-readiness-scan` allowlist, `admin-notifications-bell` `min-w-0`
3. Allineare flex baseline: `npm run flex:baseline:generate` (o aggiornare entry count) → `smoke:regression` verde
4. Verificare `release-gate` verde su `main`

### P1 — Prima clienti esterni

1. RBAC-01: `guest.can_read_operational: false` + test route matrix
2. RBAC-02: E2E cross-cliente obbligatorio in CI con 2 account
3. Env production: forzare DB-primary preventivi/schede (no LS business)
4. Applicare migration pending su staging/prod

### P2 — Robustezza scala e ops

1. Virtualizzazione lavorazioni/magazzino
2. PDF worker o server-side render
3. APM opzionale (Sentry) o runbook alert su `CAB_OPS_WARN`
4. `ensureSectionWrite` uniforme su services

### P3 — Pulizia

1. Rimuovere dead export portal documents
2. Rimuovere route PDF legacy dopo grace period
3. Disabilitare dev mounts in production build

---

## Risposta finale

### «Se oggi dessimo accesso a dipendenti, responsabili e clienti reali, il sistema sarebbe davvero pronto per la produzione?»

**Dipendenti e responsabili (staff interno):** **Quasi sì** — il sistema è utilizzabile in produzione **dopo** che `release-gate` è verde, i secret Supabase sono configurati, le migration sono applicate, e i fix P0 sono su `main`. L’esperienza è allineata a un gestionale maturo con RLS; aspettarsi occasionali errori permessi se `user_permissions` non sono configurati per ruolo.

**Clienti esterni:** **No, non ancora.** Il portale richiede chiusura esplicita del rischio cross-tenant (RBAC-02) e test E2E dedicati prima di aprire l’accesso a clienti reali.

**Rilascio definitivo senza riserve:** richiede P0+P1 completati, validazione mobile su device reali, e decisione su observability esterna.

---

*Report generato nell’ambito del piano Production Readiness Audit 2026-06. Non modificare il file piano in `.cursor/plans/`.*
