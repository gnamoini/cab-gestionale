# FASE 14 — Prioritizzazione finale e sign-off (Gestionale CAB)

Consolidamento del piano audit (fasi 1–13): stato correzioni, backlog residuo, matrice test e checklist go-live. Verificato **2026-06-02**.

**Documento master:** [`technical-audit-report.md`](./technical-audit-report.md)

**Legenda stato:** ✅ completato · ⚠️ parziale · 📋 backlog accettato · 🚀 operativo (deploy)

---

## Sintesi esecutiva

| Metrica | Valore |
|---------|--------|
| Fasi audit documentate | 14 (fase 1 nel piano; fasi 2–14 in `docs/audit-phase*.md`) |
| Sprint 0 CRITICO | **5/5 ✅** |
| Sprint 1 ALTO | **7/7 ✅** (incluso client portal E2E) |
| Sprint 2 MEDIO | **6/6 ✅** (code split esteso fasi 12–13) |
| Sprint 3 BASSO | **2/5 ✅** · 3 backlog doc/analyzer |
| Smoke regression CI | **67** test file in `scripts/smoke-regression-tests.ts` |
| Playwright smoke | **12** spec in `e2e/smoke/` |
| Migration Supabase pending | **3** (da applicare su staging/prod) |

**Verdetto audit:** codebase **merge-ready** con gate CI verdi; deploy production richiede applicazione migration e smoke manuale su device reali (iOS Safari).

---

## Piano correzione originale — stato

### CRITICO (Sprint 0) — ✅ tutti completati

| # | Item | Stato | Evidenza |
|---|------|-------|----------|
| 1 | BUNDER → Supabase | ✅ | `bunder_documents`, sync adapter, migration |
| 2 | Audit RLS completo | ✅ | `npm run audit:rls` |
| 3 | RbacPageGuard fail-closed | ✅ | `rbac-page-guard.tsx` |
| 4 | PDF preview cache | ✅ | POST inline blob |
| 5 | Rimozione Supporto | ✅ | migration deprecazione + route rimossa |

### ALTO (Sprint 1) — ✅ tutti completati

| # | Item | Stato | Evidenza |
|---|------|-------|----------|
| 6 | `dipendenti` in SECTION_TO_MODULE | ✅ | fase 8 |
| 7 | Rimozo `cab.authRoleHint` bypass | ✅ | permission-guards |
| 8 | Timesheet flush beforeunload | ✅ | fase 9 hook |
| 9 | E2E bunder, dipendenti, preventivi, client portal | ✅ | spec 08–11 |
| 10 | Smoke regression espansa | ✅ | 67 test + policy fasi 9–14 |
| 11 | `.cursor/debug*.log` gitignore | ✅ | `.gitignore` |
| 12 | Wire modali dead | ✅ | DipendenteDetailModal, client docs |

### MEDIO (Sprint 2) — ✅ completati (scope audit)

| # | Item | Stato | Note |
|---|------|-------|------|
| 13 | Lazy loading modals | ✅ | lavorazioni, preventivi, bunder, report, documenti |
| 14 | Preventivi localStorage → DB | ✅ | DB-primary |
| 15 | Report manual → app_settings | ✅ | fase 12 doc |
| 16 | Rate limit login | ✅ | `ip-rate-limit.ts` |
| 17 | Validazione server actions | ✅ | admin-user-validation |
| 18 | Virtualizzazione / server pagination | 📋 | backlog P2 — EC-001 |

### BASSO (Sprint 3) — parziale

| # | Item | Stato | Note |
|---|------|-------|------|
| 19 | Dead exports cleanup | ✅ | parziale sprint 1 |
| 20 | `useSchedeBundlesQuery` consolidate | ✅ | lavorazioni-view |
| 21 | Auth structured logger | 📋 | console.warn residui |
| 22 | Living docs data-sync/rbac/audit-checklist | ✅ | `docs/data-sync.md`, `rbac-matrix.md`, `audit-checklist.md` |
| 23 | Bundle analyzer CI | 📋 | P12-005 |

---

## Backlog consolidato post-audit

Priorità unificata da fasi 4–13. Solo item **non risolti** nell'audit.

| ID | Severità | Dominio | Descrizione | Fase origine |
|----|----------|---------|-------------|--------------|
| EC-001 | P2 | Performance | Virtualizzazione o pagination server lavorazioni/magazzino | 4, 12 |
| EC-002 | P1→P2 | Sync | Timesheet last-write-wins multi-tab; optimistic lock | 4, 9 |
| EC-005 | P2 | UX | `entriesError` dipendenti — griglia read-only + banner | 4 | ✅ fase 14 review |
| EC-006 | P2 | RBAC | Preventivi write vs editWorkOrders drift | 4 | ✅ `ensureSectionWrite("preventivi")` |
| EC-007 | P2 | Storage | Documenti orphan file su upload fail | 4, 11 |
| EC-009 | P2 | UX | Settings failsafe 5s → toast warning | 4 | ✅ toast in settings gate |
| N10-001 | P3 | Notifiche | Bell solo localStorage (by-design) | 10 |
| N10-002 | P3 | Notifiche | Toast dedup cross-tab parziale | 10 |
| F11-001 | P3 | Form | Promemoria modal senza unsaved guard | 11 | ✅ unsaved dialog |
| P12-003 | P2 | Perf | `@tanstack/react-virtual` assente | 12 |
| P12-004 | P2 | Perf | Full fetch liste server | 12 |
| P12-005 | P3 | Perf | Bundle analyzer in CI | 12 |
| P13-001 | P2 | Compat | Firefox / WebKit Playwright | 13 |
| P13-003 | P2 | Compat | Input font mobile BUNDER/schede | 13 | ✅ BUNDER filtri |
| P13-004 | P3 | Compat | E2E filter drawer mobile | 13 |
| S6 | P2 | Security | Edge proxy vs permessi granulari (accettato) | 7 |

**Nessun blocker CRITICO/ALTO aperto** dal piano originale.

---

## Matrice test E2E (Playwright)

Browser CI: **Chromium Desktop Chrome** only. Viewport mobile simulato dove indicato.

| Spec | Focus | Viewport | Gate CI |
|------|-------|----------|---------|
| `01-auth.spec.ts` | Login / sessione | desktop | ✅ release-gate |
| `02-rbac-routes.spec.ts` | Route RBAC | desktop | ✅ |
| `03-dashboard-report.spec.ts` | Dashboard + report | desktop | ✅ |
| `04-modal-scroll.spec.ts` | Drawer, scroll lock, gutter | mobile + desktop | ✅ |
| `05-document-lifecycle.spec.ts` | Documenti CRUD | desktop | ✅ |
| `06-mobile-shell.spec.ts` | Overflow dashboard | 390×844 | ✅ |
| `07-hydration-runtime.spec.ts` | Hydration | desktop | ✅ |
| `08-bunder.spec.ts` | BUNDER smoke | desktop | ✅ |
| `09-dipendenti.spec.ts` | Dipendenti smoke | desktop | ✅ |
| `10-preventivi.spec.ts` | Preventivi smoke | desktop | ✅ |
| `11-client-portal.spec.ts` | Portale clienti | desktop | ✅ |
| `12-mobile-routes.spec.ts` | Overflow 4 route | 390×844 | ✅ |

```bash
npm run smoke:playwright
```

---

## Regression baseline CI

| Gate | Comando | Ruolo |
|------|---------|-------|
| TypeScript | `npm run ci:tsc` | Zero errori compile |
| Build | `npm run ci:build` | Next.js production |
| UX enforce | `npm run ux:enforce` | Toast/interaction policy |
| UX mobile | `npm run ux:mobile-gate` | Scroll containment mobile |
| Structural | `npm run smoke:structural` | Import/architecture |
| Regression | `npm run smoke:regression` | 67 test domain + flex + audit policy |
| RLS | `npm run audit:rls` | Policies vs services |
| Production | `npm run production:check` | Env + DB readiness |
| Playwright | `npm run smoke:playwright` | 12 spec E2E |

Policy audit aggiunte fasi 9–14:

- `sync-invalidation-policy.test.ts`
- `notifications-policy.test.ts`
- `forms-save-policy.test.ts`
- `performance-policy.test.ts`
- `compatibility-policy.test.ts`
- `audit-signoff-policy.test.ts`

---

## Checklist sicurezza RLS (sign-off)

| Controllo | Stato | Verifica |
|-----------|-------|----------|
| RLS attivo su tabelle operative | ✅ | `audit:rls` PASS |
| Service role solo server-side | ✅ | no key su Vercel |
| BUNDER `bunder_documents` RLS | ✅ | migration 20260704120000 |
| Supporto tabelle deprecate read-only admin | ✅ | migration 20260704130000 |
| Realtime publication gap timesheet/permissions | 🚀 | migration 20260705120000 **da deployare** |
| Fail-closed RBAC timeout | ✅ | RbacPageGuard |
| PDF no token cross-istanza | ✅ | POST inline |

---

## Checklist sign-off PO / QA

| # | Criterio | Responsabile | Stato |
|---|----------|--------------|-------|
| 1 | Tutti gate CI verdi su branch release | Dev | ☐ |
| 2 | Migration Supabase applicate su staging | Ops | ☐ |
| 3 | Smoke Playwright verde con credenziali prod-like | QA | ☐ |
| 4 | Test manuale iOS Safari (login + modale + kanban) | QA | ☐ |
| 5 | Pre-deploy checklist completata | Ops | [`pre-deploy-checklist.md`](./checklists/pre-deploy-checklist.md) |
| 6 | Post-deploy checklist | Ops | [`post-deploy-checklist.md`](./checklists/post-deploy-checklist.md) |
| 7 | Backup DB prima migration | Ops | ☐ |
| 8 | Rollback plan documentato | Ops | ☐ |

**Firma audit tecnico (dev):** audit fasi 2–14 documentate; fix CRITICO/ALTO chiusi; backlog P2+ tracciato sopra.

---

## Operativo deploy

Migration da applicare **prima** del go-live:

1. `20260704120000_bunder_documents.sql`
2. `20260704130000_deprecate_supporto_tables.sql`
3. `20260705120000_gestionale_sync_realtime_gaps.sql`

Comando verifica completa locale (con secrets):

```bash
npm run release:gate
```

---

## Indice documenti audit

| Fase | Documento |
|------|-----------|
| 2 | [`audit-phase2-page-inventory.md`](./audit-phase2-page-inventory.md) |
| 3 | [`audit-phase3-bug-hunt-plan.md`](./audit-phase3-bug-hunt-plan.md) |
| 4 | [`audit-phase4-edge-cases.md`](./audit-phase4-edge-cases.md) |
| 5 | [`audit-phase5-storage-audit.md`](./audit-phase5-storage-audit.md) |
| 6 | [`audit-phase6-technical-debt.md`](./audit-phase6-technical-debt.md) |
| 7 | [`audit-phase7-security-audit.md`](./audit-phase7-security-audit.md) |
| 8 | [`audit-phase8-permissions-audit.md`](./audit-phase8-permissions-audit.md) |
| 9 | [`audit-phase9-data-sync-audit.md`](./audit-phase9-data-sync-audit.md) |
| 10 | [`audit-phase10-notifications-audit.md`](./audit-phase10-notifications-audit.md) |
| 11 | [`audit-phase11-forms-save-audit.md`](./audit-phase11-forms-save-audit.md) |
| 12 | [`audit-phase12-performance-audit.md`](./audit-phase12-performance-audit.md) |
| 13 | [`audit-phase13-compatibility-audit.md`](./audit-phase13-compatibility-audit.md) |
| 14 | **questo documento** |

---

## Roadmap post-audit (opzionale)

| Trimestre | Focus | Item backlog |
|-----------|-------|--------------|
| Q+1 | Scale liste | EC-001, P12-004, virtualizzazione |
| Q+1 | Sync robustness | EC-002 optimistic lock |
| Q+2 | Compat CI | P13-001 Firefox/WebKit |
| Q+2 | Observability | Bundle analyzer, structured auth logs |
| Backlog | UX polish | EC-005, EC-007, EC-009, F11-001 |
