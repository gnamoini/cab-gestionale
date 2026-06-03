# Audit checklist — Gestionale CAB

Checklist rapida post-audit tecnico (fasi 1–14).

**Sign-off completo:** [`audit-phase14-prioritization-final.md`](./audit-phase14-prioritization-final.md)

## Pre-merge (dev)

- [ ] `npm run ci:tsc` — PASS
- [ ] `npm run ux:mobile-gate` — PASS
- [ ] `npm run smoke:regression` — PASS
- [ ] `npm run audit:rls` — PASS
- [ ] `npx tsx lib/regression/audit-signoff-policy.test.ts` — PASS

## Pre-deploy (ops)

Vedi [`checklists/pre-deploy-checklist.md`](./checklists/pre-deploy-checklist.md):

- [ ] Migration Supabase applicate (bunder, supporto deprecate, realtime gaps)
- [ ] Secrets CI smoke configurati
- [ ] `release-gate` verde su PR

## Post-deploy (QA)

Vedi [`checklists/post-deploy-checklist.md`](./checklists/post-deploy-checklist.md):

- [ ] Login admin + operatore
- [ ] Smoke Playwright verde
- [ ] iOS Safari: login, modale, kanban (manuale)

## Documenti audit

| Fase | Doc |
|------|-----|
| 2–14 | `docs/audit-phase*.md` |
| Master | `docs/technical-audit-report.md` |

## Backlog accettato (non blocker)

- Virtualizzazione liste (EC-001)
- Timesheet optimistic lock (EC-002)
- Firefox/WebKit CI (P13-001)
- Bundle analyzer CI (P12-005)
