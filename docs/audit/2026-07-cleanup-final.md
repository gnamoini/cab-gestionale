# Audit cleanup 2026-07 — snapshot finale

> Documento di certificazione merge (gate v3). Completato 2026-07-09.

## Identità

- **Commit (HEAD):** `237c744c62e9adfb82ecfa8637c53072866d4418`
- **Branch:** `main` (working tree con modifiche non committate)
- **Merge-base:** `237c744c62e9adfb82ecfa8637c53072866d4418`
- **Scope decision:** **AUDIT + WIP**
- **WIP incluso + owner:**
  - Operational diary (`dashboard-diary-panel`, migration SQL, API/hooks) — owner: team gestionale
  - Dashboard widget refactor (5 widget eliminati, registry aggiornato) — owner: team gestionale
  - Collapsible prefs (`lib/ui/collapsible-prefs/`) — owner: team gestionale
  - Report manual entries import — owner: team gestionale

## Preflight — classificazione file (estratto)

| Scope | Tipo | Esempi |
|-------|------|--------|
| AUDIT | `D` | `sanity-assertions.ts`, `stock.ts`, `global-loading.tsx`, `LavorazioniDesktopTableShell`, `fe-sdi-adapter.ts`, bridge promemoria |
| AUDIT | `M` | `preventivi-storage.ts`, `schede-sync-adapter.ts`, `normalize-role-key.ts`, `email.ts`, RBAC, inbox maps |
| WIP | `??` | `dashboard-diary-panel.tsx`, `operational-diary/`, migration `20260709120000_*` |
| WIP | `D` | 5× `dashboard/widgets/*-widget.tsx` |

## Audit

- **Sprint coperti:** 1, 2, 2.5, 3 (parziale)
- **File eliminati (audit):** bridge promemoria, sanity-assertions, stock, use-runtime-event, fe-sdi-adapter, global-loading, LavorazioniDesktopTableShell, lavorazioni-filter-date-field, report-domain-metrics-grid
- **SSOT introdotti:** `lib/validation/email.ts`, `lib/dashboard/format-day-heading.ts`, `lib/lavorazioni/format-client-portal-day.ts`, `src/lib/rbac/normalize-role-key.ts`, `scripts/audit-priority-score.mjs`, `GestionaleTextarea` (textarea unico in `components/`)
- **Fix gate aggiuntivi (certificazione):**
  - `lib/rbac.ts` — re-export `isOperatorGlobalSettingsEnabled` (production-readiness scan)
  - `supabase/migrations/manual/20260801120500_drop_mezzi_legacy_attrezzatura.sql` — ripristinato path atteso da REGRESSION_CORE
  - Portale clienti — `omitUnresolvedAutore: true` in lista log autore
  - PDF preview — gate `can_read_operational` in `pdf-preview-handler.ts`

## Migration impact

- **DB migration incluse:** yes (WIP)
- **File:** `supabase/migrations/20260709120000_operational_diary_entries.sql`
- **Backward compatible:** yes (nuova tabella `operational_diary_entries`, nessuna modifica schema esistente)
- **Manual (non auto):** `supabase/migrations/manual/20260801120500_drop_mezzi_legacy_attrezzatura.sql` — R4 drop mezzi legacy, solo approvazione manuale

## Rollback

- **Commit precedente (merge-base):** `237c744c62e9adfb82ecfa8637c53072866d4418`
- **Rollback procedure:**
  1. `git revert` del merge commit (o reset branch pre-merge)
  2. Se migration `20260709120000_*` applicata: drop tabella `operational_diary_entries`
  3. R4 manual non in auto-path — nessun rollback DB se non eseguito manualmente
  4. Verificare `smoke:regression:core` su commit precedente

## Test eseguiti

| Gate | Esito |
|------|-------|
| smoke:regression:core | **PASS** |
| smoke:regression:extended | **PASS** |
| ci:tsc (src + test) | **PASS** (0 errori) |
| npm run build | **PASS** |
| production:check | **PASS** (0 blockers; DB non connesso — warning atteso) |
| rg post-fix `<textarea` | **PASS** — solo `components/gestionale/gestionale-textarea.tsx` |
| rg `localStorage.setItem` | **PASS** — classificato (vedi sotto) |

### Flag Sprint 2.5 (verifica manuale)

| Flag / helper | Stato |
|---------------|-------|
| `NEXT_PUBLIC_PREVENTIVI_DB_PRIMARY` | default DB-primary (`!== "false"`); `.env.production.example` = `true` |
| `NEXT_PUBLIC_SCHEDE_LOCAL_PRIMARY` | opt-out local (`!== "true"` = DB); esempio prod: non impostare |
| `isPreventiviDbPrimary()` | `lib/preventivi/preventivi-db-primary.ts` |
| `isSchedeDbPrimary()` | `lib/schede/schede-db-primary.ts` |
| `savePreventivi` / `upsertPreventivo` / `deletePreventivo` | no-op + warn in `preventivi-storage.ts` |
| `loadPreventivi` | solo `migrate-preventivi-local-to-db.ts` + definizione storage |
| `countPreventiviByLavorazioneId` | 0 call-site esterni (dead export, non bloccante) |

## localStorage.setItem — classificazione (Step 4)

| Categoria | File | Azione |
|-----------|------|--------|
| Theme / branding | `cab-theme-storage.ts`, `cab-branding-storage.ts`, `theme-boot-inline-script.ts` | OK |
| UI collapse / prefs | `collapsible-prefs/storage.ts`, `lavorazioni-prefs-storage.ts`, `mezzi-liste-prefs-storage.ts`, `magazzino-master-prefs-storage.ts`, `report-period-persistence.ts` | OK |
| Cache / bundle | `lavorazioni-schede-storage.ts` (TTL LRU, DB-primary), `gestionale-selector-recents.ts` | OK — cache |
| Changelog / audit locale | `*-change-log-storage.ts`, `configurazione-log-storage.ts`, `lavorazioni-change-log.ts` | OK — osservabilità UI |
| Learning / filtri | `preventivi-learning-storage.ts`, `preventivi-advanced-filters` (load/save prefs) | OK — non entity SSOT |
| Notifiche / tasks | `admin-notification-store.ts`, `dashboard-tasks-storage.ts`, `desktop-notifications.ts` | OK |
| Config / undo | `configurazione-undo-storage.ts`, `sistema-preventivi-defaults-storage.ts` | OK |
| Report manual (WIP) | `magazzino-manual-storage.ts` + `magazzino-manual-db-sync.ts` | **Review WIP** — override report con sync DB; non path entity preventivi/schede |

**Entity preventivi write:** nessun `setItem` in `preventivi-storage.ts` — conforme DB-first.

## Grep impatti indiretti (Step 4)

| Pattern | Esito |
|---------|-------|
| `global-loading.tsx` | 0 import |
| `LavorazioniDesktopTableShell` | file eliminato, 0 riferimenti |
| `sanity-assertions` / `use-runtime-event` / `fe-sdi-adapter` | 0 import in `*.{ts,tsx}` |

## Known failures (solo tsc test-only)

**Nessuno.** `ci:tsc` PASS con 0 errori su src e test. REGRESSION_CORE: nessun waiver.

## Decisione merge

**APPROVED** — tutti i gate obbligatori v3 soddisfatti (2026-07-09).

- Scope: AUDIT + WIP documentato con owner e migration
- REGRESSION_CORE: verde (nessun waiver)
- Deploy prod WIP: applicare migration `20260709120000_operational_diary_entries.sql` prima dell’uso diary
- Pre-deploy prod: `production:check` con `SUPABASE_SERVICE_ROLE_KEY` consigliato

## Post-merge — PR-20+ backlog

| Item | Regola |
|------|--------|
| Barrel morti | 1 barrel / PR |
| Import API aliases | Dopo log HTTP + Ops sign-off |
| `knip` | Advisory → backlog CI |
| Registry | `scripts/audit-simplification-registry.json` |
| `countPreventiviByLavorazioneId` | Rimozione dead export (non bloccante) |

## Rischi residui

- **WIP nel merge:** operational diary richiede deploy migration prima di prod
- **Widget dashboard rimossi:** verificare extended smoke dashboard
- **production:check DB:** eseguire con `SUPABASE_SERVICE_ROLE_KEY` pre-deploy prod
- **R4 manual migration:** non in auto-path; eseguire solo con `MEZZO_ATTREZZATURA_R4_APPROVED=1`
