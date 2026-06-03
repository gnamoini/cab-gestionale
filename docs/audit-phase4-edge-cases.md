# FASE 4 — Edge Case Analysis (Gestionale CAB)

Analisi sistematica dei casi limite per dati, permessi, ambiente e device. Basata su [`audit-phase2-page-inventory.md`](./audit-phase2-page-inventory.md) e [`audit-phase3-bug-hunt-plan.md`](./audit-phase3-bug-hunt-plan.md).

**Legenda rischio:** 🔴 P0/P1 · 🟠 P2 · 🟢 gestito · ⚪ accettato/documentato

**Legenda handling:** ✅ gestito in codice · ⚠️ parziale · ❌ gap · 🔧 fix audit applicato

---

## Sintesi esecutiva

| Categoria | Casi analizzati | 🔴 aperti | ⚠️ parziali |
|-----------|-----------------|-----------|-------------|
| Dati (volume/forma) | 42 | 3 | 8 |
| Permessi / RBAC | 18 | 1 | 4 |
| Ambiente / sync | 14 | 0 | 3 |
| Device / UX | 10 | 0 | 2 |

**Fix audit rilevanti per edge case:** RBAC fail-closed 8s · BUNDER DB · timesheet flush · report integrity fallback · PDF inline · `dipendenti` in route guards.

---

## 1. Edge case sui dati

### 1.1 Matrice per volume

| Volume | Comportamento atteso | Implementazione | Route critiche | Rischio |
|--------|---------------------|-----------------|----------------|---------|
| **Zero record** | Empty state dedicato, no crash | ✅ componenti per modulo (vedi §1.2) | tutte | 🟢 |
| **Un solo record** | Sort/pager ok; delete ultimo → empty | ⚠️ pager client `CLIENT_PAGE_SIZE=100` — con 1 riga ok; delete ultimo mezzo/lavorazione testare deps | mezzi, lavorazioni | 🟠 |
| **Centinaia** | Client pagination 100/pagina | ✅ `useClientPagination`, `useResponsiveListPageSize` | report tops, documenti marche, dashboard log | 🟢 |
| **Migliaia+** | Performance accettabile | ❌ **no virtualizzazione** (`@tanstack/react-virtual` assente); liste lavorazioni/magazzino render full DOM | lavorazioni, magazzino | 🔴 P2 perf |
| **Cap query log** | Troncamento esplicito | ✅ log 500 max; auth_logs 1000; client portal log cap 2000 | dashboard, client detail | 🟠 |

**Fetch liste operative:** `fetchLavorazioniListRows` — nessun `.limit()` server-side esplicito nel fetch base → tutte le lavorazioni non soft-deleted caricate in memoria. Stesso pattern probabile su magazzino ricambi.

---

### 1.2 Zero record — empty states per modulo

| Modulo | Componente / messaggio | Varianti | File |
|--------|------------------------|----------|------|
| Dipendenti | `DipendentiEmptyState` / `TimesheetEmptyState` | `no-addetti`, `no-employees`, `select-employee`, `no-entries` | `dipendenti-empty-state.tsx` |
| Lavorazioni kanban | testo colonna | "Nessuna lavorazione" per colonna | `lavorazioni-kanban-view.tsx` |
| Hub preventivi | `PreventiviHubEmptyState` | CTA crea preventivo | `lavorazione-preventivi-hub-list.tsx` |
| Magazzino sotto-scorta | `MagazzinoSottoScortaEmptyState` | bell dropdown | `magazzino-giacenza-bell.tsx` |
| Dashboard tasks | `NotesEmptyState` | note locali LS | `dashboard-tasks-panel.tsx` |
| Dashboard widgets | `WidgetEmpty` | KPI senza dati | `dashboard-operational-cards.tsx` |
| Promemoria giorno | panel empty | giorno senza eventi | `dashboard-promemoria-day-panel.tsx` |
| Client portal | sezione vuota + filtri attivi | copy distinto | `client-lavorazioni-view.tsx` |
| Mezzi hub | `MezziHubTabEmpty` | per tab hub | `mezzi-hub-ui.tsx` |
| Tabelle globali | `GestionaleListTableMobileEmpty` | mobile list | `gestionale-list-table-shell.tsx` |
| Log UI | empty generico | feed vuoto | `gestionale-log-ui.tsx` |
| Report lavorazioni | copy archivio vuoto | manual entry hint | `report-lavorazioni-section.tsx` |

**Edge case dipendenti (catena):**
1. Zero addetti in settings → `no-addetti` (link a Configurazione)
2. Addetti ok, registry DB vuoto → `no-employees` + bootstrap CTA
3. Registry ok, zero entries mese → griglia visibile, celle vuote; detail view `no-entries`
4. **`entriesError`** → griglia **nascosta**, messaggio testuale (⚠️ UX: dipendente visibile ma griglia off)

---

### 1.3 Soft-delete e archivio

| Tipo | Meccanismo | Edge case | Handling |
|------|------------|-----------|----------|
| Lavorazioni **soft-delete** | `deleted_at IS NULL` filter | Record eliminato sparisce da ERP; portale? | ✅ `applyLavorazioniNotDeletedFilter` |
| Lavorazioni **archivio** | `archived === true` | Split in corso vs archivio ERP e portale | ✅ `isLavorazioneArchived` / `client-portal-stati` |
| Promemoria soft-delete | `deleted_at` | Feed dashboard | ✅ tipo in `dashboard-promemoria-types` |
| Report KPI | esclude deleted + mezzo orfano | Lavorazione chiusa senza data archivio | ✅ `report-data-integrity-layer` + adapter |
| Documenti / storage | delete row + blob | Orphan file in bucket se insert fail | ⚠️ P2 — no job cleanup documentato |

**Edge:** utente con deep-link a lavorazione soft-deleted → modal/detail deve mostrare deny o empty, non crash. Verificare in Fase 3 T10.

---

### 1.4 Dati parziali / incompleti

| Scenario | Dove | Comportamento atteso | Stato |
|----------|------|---------------------|-------|
| Lavorazione **senza mezzo** | lista/kanban/hub | Render con placeholder; report integrity può escludere | ⚠️ verificare cella UI |
| Scheda **senza ingresso** | hub schede | Tab vuota / CTA import | ✅ hub empty states |
| Ricambio **senza compat** | magazzino | Compat audit warning; search SSOT | ⚠️ `compat-ssot-scan` FAIL in CI |
| Ricambio **compat orphan refs** | magazzino | Auditor `orphan_refs` issue | ⚠️ audit UI |
| Preventivo **senza mezzo match** | preventivi hub | Empty "nessun preventivo per questo mezzo" | ✅ |
| Mezzo **delete con deps** | mezzi | RPC/message lavorazioni collegate | ⚠️ race async |
| Timesheet **addetti non sync** | dipendenti | `no-addetti` finché settings non caricate | ✅ gate settings loading |
| Report **query parziale fail** | report | Integrity `degraded`/`blocked`; svuota fonte errore | ✅ `applyQueryErrorFallback` |
| Client detail **signed URL scaduto** | portale media | Re-fetch o errore graceful | ⚠️ 3600s expiry |
| BUNDER **payload JSONB corrotto** | bunder | Parse error → row skip o error boundary | 📋 da verificare |

---

### 1.5 Dati inconsistenti (multi-source)

| Drift | Sorgenti | Sintomo | Mitigazione |
|-------|----------|---------|-------------|
| Mezzi liste prefs | localStorage vs `app_settings` | Filtri/colonne diversi per device | ⚠️ legacy LS; master in DB |
| Report magazzino manual | LS + `app_settings.report.*` | Override non visibile altro device | 🔧 sync DB post-fix; dual-write transitorio |
| Schede lavorazione | DB primary vs LS fallback | Schede mancanti se flag legacy | ⚠️ migration path |
| Preventivi legacy | LS vs DB | Count diverso in impostazioni | ⚠️ `preventivi-storage` deprecated |
| Change log undo | LS per-modulo vs server log | Undo non allineato cross-device | ⚪ by design (device-local undo) |
| BUNDER change log | solo LS | Storico modifiche non cross-device | ⚠️ P3 |
| Admin notifications | LS per `userId` | Non cross-device/tab indipendenti | ⚪ documentato |

---

### 1.6 Duplicati e similarità

| Gate | Tipo | Bloccante? | File |
|------|------|------------|------|
| Settings liste | dialog conferma | **Sì** (add/rename) | `use-settings-similar-gate.tsx`, `settings-simile-confirm-dialog.tsx` |
| Mezzi identificativo | warning inline | No | `EntitySimilarWarning` in `mezzi-view.tsx` |
| GlobalSelect free-text | warning fuzzy | No | `global-select.tsx` |
| Magazzino descrizione | fuzzy pool | ⚠️ warning, non gate globale | `findSimilarEntityInPool` |
| BUNDER / preventivi titolo | — | ❌ no gate duplicati | 🔴 P3 |

**Edge:** due entità "quasi uguali" (es. "Ferrari" vs "Ferrari S.p.A.") — settings blocca con dialog; mezzi/magazzino solo warning → possibile duplicato reale.

---

## 2. Edge case permessi

### 2.1 Architettura (layer)

```
Edge proxy → AuthGate → SettingsReadyGate → RbacPageGuard → GestionaleSectionGate → service ensurePermission → Supabase RLS
```

Ogni layer può avere edge diversi; **RLS è autoritativo** per mutazioni DB.

---

### 2.2 Matrice ruoli

| Ruolo | Read operativo | Write | Delete | Note edge |
|-------|----------------|-------|--------|-----------|
| **admin** | tutto (ecc. staging block) | tutto | sì | — |
| **manager** | capability-based | capability-based | capability-based | — |
| **operatore** | moduli + `user_permissions` | idem | se `canDeleteRecords` | deny granulare per modulo |
| **guest** / **ospite** | read-only | ❌ | ❌ | `isReadOnly` in `use-rbac` |
| **cliente** | solo portale | ❌ ERP | ❌ | `clientLavorazioniAllowed` required |

**Guest edge:** `canWriteAnyOperational` false; bottoni write devono essere disabled — verificare per-modulo (Fase 3 T5).

---

### 2.3 Granularità `user_permissions`

| Scenario | Layer che applica | Edge | Stato post-fix |
|----------|-------------------|------|----------------|
| Deny modulo `magazzino` read | `RbacPageGuard` + `GestionaleSectionGate` | Route block + fallback UI | ✅ |
| Deny modulo `dipendenti` | `can-access-route` SECTION_TO_MODULE | | ✅ in route guards |
| Nav hide dipendenti deny | `useNavHrefPermission` | Usa `gestionaleNavHrefToModule("/dipendenti")` | ✅ (href mapping) |
| Fallback `SECTION_TO_MODULE` in `use-permissions.ts` | senza href | **Manca `dipendenti`** nel map locale | ⚠️ solo se `navHrefToSection` senza href match |
| BUNDER access | capability RBAC sezione `bunder` | **Non** in `GESTIONALE_PERMISSION_MODULES` | ⚪ capability-only |
| Report deny | modulo `report` | Operatore → acesso-negato | ✅ smoke `02-rbac-routes` |
| Preventivi write vs `editWorkOrders` | service layer | Operatore con preventivi write ma no editWorkOrders? | ⚠️ drift capability |
| Edge proxy vs client | middleware | Proxy non carica `user_permissions` granulari | ⚪ accettato + section gate |

---

### 2.4 Client portal

| Scenario | Pass atteso | Rischio |
|----------|-------------|---------|
| Cliente **senza allowlist** | Redirect `/acesso-negato` | 🔴 P0 |
| Cliente con allowlist **vuota** | Lista empty, no leak | 🟠 |
| URL **ID non autorizzato** | Deny; no dati altri clienti | 🔴 P0 |
| Layout server vs hook client **desync** | Fail-closed layout vince | ⚠️ race loading |
| Admin apre `/lavorazioni-clienti` | Comportamento dedicato (non cliente) | ⚪ |
| Lavorazione **archived** vs **deleted** | Archived in tab archivio; deleted assente | ✅ stati portale |

---

### 2.5 Loading / failsafe permessi

| Gate | Timeout | Comportamento | Stato |
|------|---------|---------------|-------|
| `RbacPageGuard` | 8s | **Fail-closed** — blocco + reload | 🔧 ✅ post-fix |
| `GestionaleSettingsReadyGate` | 5s | Procede con defaults (degrada) | ⚠️ dati settings default |
| `GestionaleSectionGate` | fino a query permessi | Skeleton compact | ✅ |
| `useUserPermissionsQuery` | staleTime ∞ | Richiede invalidazione esplicita post-admin change | ⚠️ T6 Fase 3 |

**Edge storico (risolto):** failsafe 8s che **renderizzava children** → exposure temporanea. Ora bloccato in `rbac-page-guard.tsx` L97–115.

---

## 3. Edge case ambiente

### 3.1 Staging public slice

**Attivazione:** `NEXT_PUBLIC_STAGING_PUBLIC=1` ([`lib/env/staging-public.ts`](../lib/env/staging-public.ts))

| Aspetto | Comportamento |
|---------|---------------|
| Moduli **bloccati** | `/preventivi`, `/documenti`, `/magazzino`, `/bunder`, `/report`, `/dipendenti` |
| Moduli **safe** | `/dashboard`, `/lavorazioni`, `/mezzi` |
| Middleware | `isStagingBlockedPathname` → redirect |
| Nav | Badge "In aggiornamento"; link disabilitati |
| Dashboard | Widget staging-sensitive nascosti (`isStagingPublicSlice`) |
| Production guard | `validate-production-env` → **blocker** se staging flag in prod |

**Edge:** login redirect post-auth verso path bloccato → `resolve-post-login-redirect` deve riportare a safe href.

---

### 3.2 Auth degraded

| Trigger | UI | Proseguimento |
|---------|-----|---------------|
| Session apply fail | Banner "Verifica sessione in corso…" | `GestionaleAuthGate` auto-refresh |
| Init timeout | status `degraded` | mantiene `lastStableUserRef` |
| Rete down on refresh | degraded, retry | non logout immediato |
| Config Supabase missing | Block screen | no children |

**Edge:** operazioni write in stato `degraded` — dipendono da sessione Supabase effettiva; banner non blocca pointer events solo su `loading`, non su `degraded`.

---

### 3.3 Multi-tab e sync

| Meccanismo | Edge case | Handling |
|------------|-----------|----------|
| `BroadcastChannel` | Burst duplicate invalidate | ✅ dedup in `gestionale-sync-dispatch` |
| Realtime down | Max ~20s lag + polling | ⚠️ |
| Realtime up | `refetchOnMount` disabilitato policy | stale fino a evento |
| Tab A mutate → Tab B | broadcast `local_mutation` only | ✅ |
| Admin notifications | LS per tab/user | indipendenti per tab |
| Timesheet 2 tab stesso mese | last-write-wins entries | 🔴 P1 — test B2 Fase 3 |
| BUNDER 2 tab | last-write-wins JSONB | 🔴 P1 |

**Undo session:** `gestionale-undo-session-id` in sessionStorage — pulito a logout.

---

### 3.4 Config / deploy

| Condizione | Edge |
|------------|------|
| Migration non applicata | BUNDER fallback LS; `deleted_at` filter fail |
| Preview Vercel senza staging flag | Warning in `production:check` |
| PDF multi-istanza | 🔧 fix POST inline blob |
| Service role leak | solo server actions admin |

---

## 4. Edge case device

| Device / viewport | Comportamento | Storage | Test auto |
|-------------------|---------------|---------|-----------|
| **Mobile** (< md) | Drawer nav; card list | kanban open section SS | ✅ `06-mobile-shell` |
| **Mobile iOS modal** | Body scroll lock release | — | ✅ `04-modal-scroll` |
| **Tablet** (md+) | Sidebar collapsible | `cab-sidebar-collapsed` LS | 📋 |
| **Desktop** | Sidebar persistent | LS collapse state | 📋 |
| **Touch timesheet** | Popover editor cella | — | 📋 |
| **Print/PDF dipendenti** | jsPDF layout | — | 📋 |
| **Scrollbar main** | hit target bordo destro | — | ✅ `04-modal-scroll` |

**Edge mobile lavorazioni:** filtri avanzati in sessionStorage — sopravvivono refresh ma non cross-device.

**Edge tablet:** sidebar collapsed + modale wide — verificare overflow hub schede.

---

## 5. Schede per pagina (edge case prioritari)

Sintesi **top 3 edge** per route; procedura completa in Fase 3.

| Route | Edge #1 | Edge #2 | Edge #3 |
|-------|---------|---------|---------|
| `/dashboard` | tasks LS only device | promemoria deleted_at feed | staging widget hide |
| `/lavorazioni` | full list no virtualize | dual filter client/server | schede optimistic 2 tab |
| `/lavorazioni-clienti` | allowlist empty | ID enumeration | documents dialog unwired |
| `/lavorazioni-clienti/[id]` | signed URL expiry | log cap 200 | soft-delete vs deny |
| `/preventivi` | orphan ephemeral draft | write permission drift | PDF blob |
| `/documenti` | storage orphan | tree pagination + filter | signed URL 1h |
| `/magazzino` | scorta queue race | compat orphan refs | sotto-scorta bell |
| `/mezzi` | delete deps race | similar warning non blocking | filter ultima lav client-only |
| `/dipendenti` | entriesError hides grid | bootstrap partial fail | 2-tab timesheet |
| `/bunder` | JSONB corrupt row | change log LS only | no duplicate gate |
| `/report` | partial query degraded | manual override dual-write | no realtime |
| `/impostazioni` | similar gate block rename | unsaved navigate | settings failsafe 5s defaults |
| `/dashboard/security` | invalidate permessi ∞ stale | create user validation | production readiness |
| `/login` | staging blocked redirect target | rate limit login | degraded skip auto-redirect |

---

## 6. Registro rischi edge (prioritizzato)

| ID | Edge | Sev | Azione raccomandata | Fase |
|----|------|-----|---------------------|------|
| EC-001 | Liste 1000+ righe senza virtualizzazione | P2 | Virtualize lavorazioni/magazzino o server pagination | Backlog perf |
| EC-002 | Timesheet concurrent tab last-write-wins | P1 | Optimistic lock / updated_at conflict | Fase 3 B2 |
| EC-003 | Client portal ID enumeration | P0 | E2E cliente + audit RLS | Fase 3 B5 |
| EC-004 | compat-ssot-scan CI fail | P2 | Fix `find-ricambio-in-list-cache.ts` | Sprint fix |
| EC-005 | entriesError nasconde griglia dipendenti | P2 | Mostrare griglia read-only + banner | UX |
| EC-006 | Preventivi write vs editWorkOrders drift | P2 | Allineare capability check service | RBAC |
| EC-007 | Documenti storage orphan | P2 | Cleanup job o transactional upload | Storage |
| EC-008 | BUNDER no duplicate/similar gate | P3 | Optional fuzzy gate | Backlog |
| EC-009 | Settings failsafe → defaults silent | P2 | Toast warning post-5s | UX |
| EC-010 | `use-permissions` SECTION_TO_MODULE incomplete | P3 | Aggiungere `dipendenti` per simmetria | 1-line fix |

---

## 7. Mapping verifica → Fase 3

| Edge ID | Scenario Fase 3 | Tipo test |
|---------|-------------------|-----------|
| EC-001 | — | Load test manuale / Lighthouse |
| EC-002 | B2 step 3 + T13 | Manuale 2 tab |
| EC-003 | B5 | E2E cliente |
| EC-004 | — | `npm run smoke:regression` |
| EC-005 | T10 dipendenti | Manuale API mock |
| EC-006 | T6 permessi | Manuale operatore |
| EC-007 | T9 documenti | Manuale upload fail |
| EC-009 | T1 impostazioni throttle | Network slow 5s |
| EC-010 | T6 nav | Deny dipendenti granulare |

---

## 8. Checklist esecuzione rapida (edge-only)

Esecuzione ~2h per copertura P0/P1:

1. [ ] Dipendenti: zero addetti → no-addetti → aggiungi addetto → bootstrap → no-entries mese
2. [ ] Dipendenti: simula `entriesError` (offline mid-load) — documentare UI
3. [ ] Lavorazioni: unica riga in corso → delete → empty kanban column
4. [ ] Lavorazioni: archived row solo in archivio ERP e portale
5. [ ] Client: allowlist deny + URL alien ID
6. [ ] Staging flag: nav blocked modules + direct URL redirect
7. [ ] RBAC: throttle permessi 8s → fail-closed panel
8. [ ] Report: kill una query (offline) → integrity badge degraded
9. [ ] Settings: add voce simile → dialog block
10. [ ] Multi-tab: timesheet stessa cella → verifica valore finale

---

## Riferimenti codice

| Concetto | File principale |
|----------|-----------------|
| Staging slice | `lib/env/staging-public.ts` |
| RBAC fail-closed | `components/gestionale/rbac-page-guard.tsx` |
| Auth degraded | `context/auth-context.tsx`, `gestionale-auth-gate.tsx` |
| Settings failsafe | `gestionale-settings-ready-gate.tsx` |
| Soft-delete lav. | `lib/lavorazioni/lavorazioni-soft-delete.ts` |
| Archivio lav. | `lib/lavorazioni/archived.ts` |
| Report integrity | `lib/report/report-data-integrity-layer.ts` |
| Similar entities | `lib/validation/global-entity-validation.ts` |
| Broadcast dedup | `lib/sync/gestionale-sync-dispatch.ts` |
| Client pagination | `lib/ui/use-client-pagination.ts` (size 100) |

---

## Documenti correlati

- Fase 2: [`audit-phase2-page-inventory.md`](./audit-phase2-page-inventory.md)
- Fase 3: [`audit-phase3-bug-hunt-plan.md`](./audit-phase3-bug-hunt-plan.md)
- Report fix: [`technical-audit-report.md`](./technical-audit-report.md)
