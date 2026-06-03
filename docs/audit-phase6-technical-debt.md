# FASE 6 — Debito tecnico e file residui (Gestionale CAB)

Inventario di codice morto, API deprecated, gap CI, documentazione obsoleta e remediation post-audit. Verificato sul codebase a **2026-06-02**.

**Collegamenti:** [`audit-phase5-storage-audit.md`](./audit-phase5-storage-audit.md) · [`technical-audit-report.md`](./technical-audit-report.md)

**Legenda stato:** ✅ risolto audit · ⚠️ parziale · ❌ aperto · 📋 accettato/documentato

---

## Sintesi esecutiva

| Categoria | Totale | ✅ | ⚠️ | ❌ |
|-----------|--------|----|----|-----|
| Moduli / feature rimosse | 1 | 0 | 1 | 0 |
| File / export morti | 8 | 2 | 2 | 4 |
| API deprecated attive | 12+ | 1 | 8 | 3 |
| CI / quality gate | 4 | 1 | 1 | 2 |
| Performance / bundle | 3 | 1 | 2 | 0 |
| Sicurezza / hygiene | 4 | 3 | 1 | 0 |
| Documentazione drift | 5 | 0 | 0 | 5 |

**Baseline runtime (2026-06-02):**
- `npm run ci:tsc` → **FAIL** (5 errori in 2 file)
- `npm run smoke:regression` → **FAIL** su `compat-ssot-scan.test.ts`
- Test file `.test.ts` nel repo: **~140** · in `smoke:regression`: **58** → **~82 fuori CI**

---

## 1. Modulo Supporto (rimosso)

| Elemento | Stato | Dettaglio |
|----------|-------|-----------|
| Route `/supporto` | ✅ | `app/(gestionale)/supporto/page.tsx` eliminato (git) |
| Componenti `supporto/*` | ✅ | 0 file in tree |
| Riferimenti codice app | ✅ | Nessun import route/hook/service supporto |
| DB `segnalazioni` / `support_notes` | ⚠️ | Migration `20260704130000_deprecate_supporto_tables.sql` — write revocato, SELECT admin only |
| Docs obsolete | ❌ | `docs/supabase-schema-refactor-report.md`, `docs/realtime-sync-qa-checklist.md` citano ancora Supporto attivo |

**Azione P2:** applicare migration in env target; aggiornare docs schema/QA; pianificare drop tabelle dopo backup.

---

## 2. File morti e re-export inutili

| ID | File | Motivo | Import app | Rischio | Remediation |
|----|------|--------|------------|---------|-------------|
| TD-001 | `components/gestionale/gestionale-list-select.tsx` | re-export deprecated | **0** | BASSO | ❌ **Eliminare file** |
| TD-002 | `components/design-system/data-table.tsx` | export DS | solo `index.ts` barrel, **0 usage view** | BASSO | ❌ Rimuovere export + file |
| TD-003 | `lib/mezzi/mezzi-change-log-storage.ts` | change log LS mezzi | **0** (mezzi usa server log via `useUndoableLog`) | BASSO | ❌ Delete file |
| TD-004 | `components/lavorazioni-clienti/client-lavorazione-documents.tsx` | `ClientLavorazioneDocumentsDialog` | **non montato** su detail page | MEDIO | ❌ Wire su detail o rimuovere |
| TD-005 | `gestionale-sort-th` shim | — | ✅ Usato via `global-table-header` re-export | — | 📋 Tenere fino a migrazione call site |
| TD-006 | `DipendenteDetailModal` | — | ✅ montato in `dipendenti-view.tsx` | — | ✅ Risolto audit |
| TD-007 | `lib/sistema/cab-events.ts` no-op stubs | — | ✅ Solo dispatch attivi rimasti | — | ✅ Pulito audit |
| TD-008 | `lib/sync/cab-realtime-broadcast.ts` legacy subscribe | — | ✅ `subscribeGestionaleBroadcastLegacy` rimosso | — | ✅ Risolto audit |

---

## 3. API deprecated ancora in uso

### 3.1 Alto impatto

| API | File | Usato da | Piano |
|-----|------|----------|-------|
| `loadPreventivi()` | `preventivi-storage.ts` | `sistema-impostazioni-modal.tsx` (count legacy LS) | ⚠️ Sostituire con count DB / RQ |
| `preventivi-storage` write path | `preventivi-storage.ts` | sync-adapter fallback | ⚠️ Solo se `PREVENTIVI_DB_PRIMARY=false` |
| `useSchedeStoreQuery` | `use-schede-store-query.ts` | `use-lavorazione-schede-store-sync.ts` | ⚠️ Migrare a `useSchedeBundlesQuery` |
| `consumePdfPreview` GET token | `pdf-preview-cache.ts` | `pdf-anteprima/route.ts` GET legacy | ⚠️ POST inline primary; deprecare GET |
| `magazzinoRowToRicambioUI` in cache lookup | `find-ricambio-in-list-cache.ts` | SSOT scan **FAIL** | ❌ Fix entro CI |

### 3.2 Basso impatto (shim / alias)

| API | Sostituto | Note |
|-----|-----------|------|
| `SCHEDE_STORE_QUERY_KEY` | `SCHEde_BUNDLES_QUERY_KEY` | Alias export, coexistent |
| `GestionaleSortTh` | `GlobalTableSortTh` | Re-export in global-table |
| `GlobalLoading` barrel | `@/components/design-system/loading` | Graduale |
| `lib/env/pilot-operator-settings` | `operator-global-settings` | Re-export |
| `RuoloProfile` type | `RuoloUtente` | Tipo DB |
| ~20 `@deprecated` in flex/responsive/report | token SSOT | Governance flex — non blocking |

**Nota positiva:** `lavorazioni-view.tsx` e dashboard usano già `useSchedeBundlesQuery` ✅

---

## 4. Quality gate e CI

| Gate | Stato | Blocker |
|------|-------|---------|
| `npm run ci:tsc` | ❌ FAIL | `lib/pdf/gestionale-section-table.ts` (4 errori overload/types) |
| | | `src/hooks/use-permissions.ts` — `"ospite"` ∉ union ruolo canonical |
| `npm run smoke:regression` | ❌ FAIL | `compat-ssot-scan.test.ts` — 2 bypass mapper in `find-ricambio-in-list-cache.ts:22,27` |
| `npm run audit:rls` | ✅ OK | 18 tabelle service |
| Playwright smoke (11 spec) | 📋 | Richiede env credentials |
| `.gitignore` debug logs | ✅ | `.cursor/debug*.log` presente |

### Test coverage gap

```
Totale *.test.ts:     ~140
In smoke:regression:    58  (~41%)
Fuori CI smoke:        ~82  (~59%)
```

**Rischio:** regressioni silenti su moduli con test esistenti ma non in pipeline (es. schede sync, documenti validation, client portal filters).

**Azione P2:** aggiungere a `smoke-regression-tests.ts`: `schede-sync.test.ts`, `client-portal-stati.test.ts`, `documenti-form-validation.test.ts` (campione ad alto valore).

---

## 5. Performance e bundle

| Item | Stato audit | Dettaglio |
|------|-------------|-----------|
| `next/dynamic` modali pesanti | ✅ | BunderEditorModal, PreventiviEditorModal, LavorazioneCreateModal, SchedeLavorazioneModal |
| Virtualizzazione liste | ❌ | Nessun `@tanstack/react-virtual` — debito perf (EC-001 Fase 4) |
| Monolithic hub modals | ⚠️ | LavorazioneDetailModal, impostazioni modal ancora static import |
| PDF preview cache in-memory | ⚠️ | GET token path legacy; POST blob risolve multi-istanza |

---

## 6. Validazione e schema

| Aspetto | Stato | Dettaglio |
|---------|-------|-----------|
| Zod | ❌ | **0 import** `zod` nel progetto |
| Validazione custom | ⚠️ | `admin-user-validation.ts` ✅; resto ad-hoc per modulo |
| Server actions critiche | ⚠️ | create user + login identifier coperti; altre parziali |

**Debito accettabile a breve termine** se RLS + permission guards restano authoritative; **medio termine:** Zod su actions ad alta superficie (security, settings bulk).

---

## 7. Logging e hygiene

| Item | Stato | File / nota |
|------|-------|-------------|
| `.cursor/debug*.log` untracked | ✅ gitignore | Rischio PII se committati per errore |
| Auth `console.warn` | ⚠️ | `auth-context.tsx`, `resolve-server-auth.ts` — noise prod |
| `[preventivi-storage] deprecated` warn | 📋 | Intenzionale fino a rimozione LS |
| `[cab-sync-bus] listener error` | 📋 | Error boundary listener |

---

## 8. RBAC / permessi — drift residuo

| ID | Issue | Stato |
|----|-------|-------|
| TD-R1 | `dipendenti` in `can-access-route` SECTION_TO_MODULE | ✅ |
| TD-R2 | `dipendenti` in `use-permissions` SECTION_TO_MODULE fallback | ❌ gap minore (nav usa `gestionaleNavHrefToModule`) |
| TD-R3 | BUNDER non in `GESTIONALE_PERMISSION_MODULES` | 📋 capability-only by design |
| TD-R4 | `cab.authRoleHint` sessionStorage | ⚠️ hint presente; bypass guards rimosso ✅ |
| TD-R5 | Ruolo `"ospite"` vs `"guest"` in types | ❌ causa errore TSC |

---

## 9. Matrice remediation prioritizzata

| Pri | ID | Azione | Effort | Impatto |
|-----|-----|--------|--------|---------|
| **P0** | TD-CI1 | Fix `use-permissions.ts` union ruolo (`ospite` → map a `guest` o estendere tipo) | S | sblocca ci:tsc |
| **P0** | TD-CI2 | Fix `gestionale-section-table.ts` errori TS | M | sblocca ci:tsc |
| **P0** | TD-CI3 | Fix `find-ricambio-in-list-cache.ts` SSOT bypass | S | sblocca smoke:regression |
| **P1** | TD-001 | Delete `gestionale-list-select.tsx` | XS | dead code |
| **P1** | TD-003 | Delete `mezzi-change-log-storage.ts` | XS | dead code |
| **P1** | TD-004 | Wire `ClientLavorazioneDocumentsDialog` o remove | S | feature gap portale |
| **P1** | TD-SUP | Applicare migration supporto + update docs | S | coerenza DB/docs |
| **P2** | TD-PREV | Count preventivi LS → query DB in impostazioni | S | deprecated path |
| **P2** | TD-002 | Remove `DataTable` unused export | XS | bundle hygiene |
| **P2** | TD-TEST | +3–5 test ad alto valore in smoke:regression | S | CI coverage |
| **P3** | TD-PDF | Deprecare GET pdf-preview-cache | M | semplificazione API |
| **P3** | TD-ZOD | Zod su 2–3 server actions | L | validation consistency |

---

## 10. Confronto piano originale Fase 6

| Voce piano originale | Stato attuale |
|----------------------|---------------|
| Modulo Supporto deleted | ⚠️ codice ok, DB/docs pending |
| `gestionale-list-select.tsx` | ❌ **file ancora presente**, zero import |
| `gestionale-sort-th.tsx` | ✅ consolidato in global-table (non file standalone) |
| `data-table.tsx` unused | ❌ ancora exportato |
| `DipendenteDetailModal` unwired | ✅ wired |
| `cab-events.ts` no-op stubs | ✅ rimossi |
| `preventivi-storage.ts` deprecated | ⚠️ ancora count in impostazioni |
| `useSchedeStoreQuery` alias | ⚠️ alias + 1 hook legacy |
| `.cursor/debug*.log` | ✅ gitignore |
| No `next/dynamic` | ✅ parziale (4 modali) |
| No Zod | ❌ invariato |
| Auth console.warn | ⚠️ invariato |

---

## 11. Checklist pulizia (PR suggerito)

```bash
# Verifica file morti (0 match atteso prima del delete)
rg "gestionale-list-select|mezzi-change-log-storage" --glob "*.{ts,tsx}"

# Gate qualità
npm run ci:tsc
npm run smoke:regression
npm run audit:rls
```

**PR «debit sprint 1» (scope minimo):**
1. Delete TD-001, TD-003
2. Fix TD-CI1, TD-CI3
3. Fix TSC pdf table (TD-CI2) o `// @ts-expect-error` temporaneo **non** raccomandato
4. Wire TD-004 o ticket esplicito

---

## 12. Documenti con drift

| Documento | Problema |
|-----------|----------|
| `docs/supabase-schema-refactor-report.md` | Supporto «attivo» |
| `docs/realtime-sync-qa-checklist.md` | riga Supporto cross-user |
| `docs/checklists/pre-deploy-checklist.md` | verificare voci supporto |
| `docs/maintenance-governance.md` | ok |
| Piano audit fase 6 originale | superato da questo doc |

---

## Riferimenti codice

| Area | Path |
|------|------|
| Dead list-select | `components/gestionale/gestionale-list-select.tsx` |
| Mezzi change log orphan | `lib/mezzi/mezzi-change-log-storage.ts` |
| SSOT scan fail | `lib/magazzino/compat/compat-ssot-scan.test.ts` |
| TSC permissions | `src/hooks/use-permissions.ts:66` |
| TSC PDF | `lib/pdf/gestionale-section-table.ts` |
| Supporto DB | `supabase/migrations/20260704130000_deprecate_supporto_tables.sql` |
| Dynamic imports | `bunder-view.tsx`, `preventivi-view.tsx`, `lavorazioni-view.tsx` |
| Smoke CI list | `scripts/smoke-regression-tests.ts` |

---

## Documenti audit per fase

| Fase | Documento |
|------|-----------|
| 2 | [`audit-phase2-page-inventory.md`](./audit-phase2-page-inventory.md) |
| 3 | [`audit-phase3-bug-hunt-plan.md`](./audit-phase3-bug-hunt-plan.md) |
| 4 | [`audit-phase4-edge-cases.md`](./audit-phase4-edge-cases.md) |
| 5 | [`audit-phase5-storage-audit.md`](./audit-phase5-storage-audit.md) |
| 6 | questo documento |
