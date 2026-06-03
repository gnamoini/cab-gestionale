# Technical Audit Report — Gestionale CAB

Report finale a seguito dell'audit tecnico completo (fasi 1–14). Stato **2026-06-02**.

**Sign-off e prioritizzazione:** [`audit-phase14-prioritization-final.md`](./audit-phase14-prioritization-final.md)

---

## Executive summary

| Area | Esito |
|------|-------|
| Sprint 0 CRITICO (5 item) | ✅ Completato |
| Sprint 1 ALTO (7 item) | ✅ Completato |
| Sprint 2 MEDIO (scope audit) | ✅ Completato |
| Blocker aperti CRITICO/ALTO | **0** |
| Backlog P2+ | 16 item tracciati in fase 14 |
| CI regression | 73 test + 12 spec Playwright |
| Deploy blocker | 🚀 4 migration Supabase da applicare |

**Verdetto:** codebase **merge-ready**; production go-live richiede migration DB + sign-off QA (iOS Safari manuale).

---

## Correzioni CRITICHE implementate

| Area | Intervento |
|------|------------|
| BUNDER | Tabella `bunder_documents` + RLS + service + sync adapter + React Query; migrazione automatica da localStorage |
| RBAC failsafe | `RbacPageGuard` fail-closed su timeout permessi (blocco + reload) |
| PDF preview | POST `/api/pdf/preview` restituisce PDF inline (endpoint neutro; legacy `/api/preventivi/pdf-anteprima` deprecato) |
| Supporto legacy | Migration deprecazione `segnalazioni` / `support_notes` (solo read admin) |

## Correzioni ALTE implementate

| Area | Intervento |
|------|------------|
| RBAC dipendenti | `dipendenti` in `SECTION_TO_MODULE` (can-access-route + permission-guards) |
| Auth hint | Rimosso bypass `cab.authRoleHint` in permission guards |
| Timesheet | Flush pending saves su `beforeunload` / `pagehide` + tracking input debounced |
| E2E | Spec Playwright: bunder, dipendenti, preventivi, client portal |
| Dead code | Rimossi shim inutili, wired `DipendenteDetailModal`, gitignore debug logs |

## Correzioni MEDIE implementate

| Area | Intervento |
|------|------------|
| Performance | Code splitting (`next/dynamic`) per modali BUNDER, Preventivi, Lavorazioni hub |
| Report manual | Sync override magazzino da localStorage → `app_settings` (modulo report) |
| Validazione | `lib/validation/admin-user-validation.ts` su create user + login identifier |
| RLS audit | Script `npm run audit:rls` |
| Sync fase 9 | Timesheet in pipeline `dispatchGestionaleAction` + Realtime publication gap |
| Sync fase 9 | `user_permissions` / `profiles` in publication Realtime + invalidate-targets |
| Notifiche fase 10 | Cap store campanella 150 voci + label toast BUNDER/promemoria |
| Form fase 11 | BUNDER unsaved guard + sync queryClient post-save |
| Performance fase 12 | Code split report analytics + documenti modals |
| Compatibilità fase 13 | Kanban skeleton scroll containment + E2E mobile routes + policy CI |

## Correzioni BASSE implementate

| Area | Intervento |
|------|------------|
| Deprecated API | `useSchedeBundlesQuery` al posto di alias deprecated in lavorazioni-view |
| Documentazione | Report + 13 documenti audit fase 2–14 + living docs + [`audit-pdf-system.md`](./audit-pdf-system.md) |
| **Review fase 14** | EC-005/006/009, F11-001, P13-003 BUNDER, living docs |
| **Input security backlog** | INP-002 reset password, INP-007/008 allowlist, INP-016 text caps — vedi [`audit-input-security.md`](./audit-input-security.md) |

---

## Matrice test E2E

| Spec | Focus |
|------|-------|
| `01-auth` | Login / sessione |
| `02-rbac-routes` | Route RBAC |
| `03-dashboard-report` | Dashboard + report |
| `04-modal-scroll` | Drawer, scroll lock (mobile + desktop) |
| `05-document-lifecycle` | Documenti |
| `06-mobile-shell` | Overflow mobile dashboard |
| `07-hydration-runtime` | Hydration |
| `08-bunder` | BUNDER |
| `09-dipendenti` | Dipendenti |
| `10-preventivi` | Preventivi |
| `11-client-portal` | Portale clienti |
| `12-mobile-routes` | Overflow mobile 4 route core |

---

## Regression baseline

```bash
npm run ci:tsc
npm run audit:rls
npm run ux:mobile-gate
npm run smoke:regression    # 73 test file
npm run smoke:playwright    # 12 spec
npm run release:gate          # gate completo CI
```

Policy audit in smoke regression: sync, notifications, forms, performance, compatibility, **audit-signoff**, **pdf-preview**, **input-security**.

---

## Checklist sicurezza RLS

| Controllo | Stato |
|-----------|-------|
| `npm run audit:rls` | ✅ script CI |
| RLS su tabelle service (18+) | ✅ verificato fase 7 |
| Service role solo server | ✅ |
| Fail-closed RBAC | ✅ |
| Realtime publication timesheet/permissions | 🚀 migration pending |

---

## Migration Supabase da applicare

- `20260704120000_bunder_documents.sql`
- `20260704130000_deprecate_supporto_tables.sql`
- `20260705120000_gestionale_sync_realtime_gaps.sql`
- `20260706120000_input_text_limits.sql`

Vedi [`checklists/pre-deploy-checklist.md`](./checklists/pre-deploy-checklist.md).

---

## Backlog post-audit (sintesi)

Item aperti non bloccanti — dettaglio in [`audit-phase14-prioritization-final.md`](./audit-phase14-prioritization-final.md):

- **P2:** virtualizzazione liste (EC-001), server pagination, timesheet optimistic lock (EC-002), Firefox/WebKit CI
- **P3:** bundle analyzer, promemoria unsaved guard, filter drawer E2E mobile, living docs aggiuntive

---

## Documenti audit per fase

| Fase | Documento |
|------|-----------|
| 2 — Inventario pagine | [`audit-phase2-page-inventory.md`](./audit-phase2-page-inventory.md) |
| 3 — Bug hunt plan | [`audit-phase3-bug-hunt-plan.md`](./audit-phase3-bug-hunt-plan.md) |
| 4 — Edge case analysis | [`audit-phase4-edge-cases.md`](./audit-phase4-edge-cases.md) |
| 5 — Storage audit | [`audit-phase5-storage-audit.md`](./audit-phase5-storage-audit.md) |
| 6 — Technical debt | [`audit-phase6-technical-debt.md`](./audit-phase6-technical-debt.md) |
| 7 — Security audit | [`audit-phase7-security-audit.md`](./audit-phase7-security-audit.md) |
| 8 — Permissions audit | [`audit-phase8-permissions-audit.md`](./audit-phase8-permissions-audit.md) |
| 9 — Data & sync audit | [`audit-phase9-data-sync-audit.md`](./audit-phase9-data-sync-audit.md) |
| 10 — Notifications audit | [`audit-phase10-notifications-audit.md`](./audit-phase10-notifications-audit.md) |
| 11 — Forms & save audit | [`audit-phase11-forms-save-audit.md`](./audit-phase11-forms-save-audit.md) |
| 12 — Performance audit | [`audit-phase12-performance-audit.md`](./audit-phase12-performance-audit.md) |
| 13 — Compatibility audit | [`audit-phase13-compatibility-audit.md`](./audit-phase13-compatibility-audit.md) |
| 14 — Prioritization & sign-off | [`audit-phase14-prioritization-final.md`](./audit-phase14-prioritization-final.md) |
| — Sistema PDF (cross-modulo) | [`audit-pdf-system.md`](./audit-pdf-system.md) |
| — Sicurezza input (form/upload) | [`audit-input-security.md`](./audit-input-security.md) |

---

## Scheda pagine

Inventario completo pagina-per-pagina: [`audit-phase2-page-inventory.md`](./audit-phase2-page-inventory.md)
