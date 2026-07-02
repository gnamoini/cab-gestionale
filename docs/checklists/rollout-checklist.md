# Rollout checklist (master)

Checklist master per il rollout reale del gestionale CAB. Usare insieme alle checklist collegate.

## Checklist collegate

- [Pre-deploy](./pre-deploy-checklist.md)
- [Post-deploy](./post-deploy-checklist.md)
- [Rollback](./rollback-checklist.md)
- [Incident](./incident-checklist.md)

## Criteri GO / NO-GO

### GO rollout

- [ ] `release-gate` verde su `main` per lo SHA da deployare
- [ ] Branch protection attiva su `main` (check `release-gate` obbligatorio)
- [ ] Vercel Deployment Protection attende `release-gate`
- [ ] Secrets GitHub Actions configurati (`SUPABASE_*`, `SMOKE_ADMIN_*`)
- [ ] Vercel Production: solo `NEXT_PUBLIC_*` (vedi [`.env.production.example`](../../.env.production.example))
- [ ] Supabase: backup/PITR abilitato
- [ ] Utenti smoke dedicati creati e testati in CI
- [ ] Pre-deploy checklist completata

### NO-GO rollout

- [ ] Blocker in `production:check` (RBAC, storage, pilot flags)
- [ ] Playwright smoke FAIL in CI
- [ ] Migration distruttiva senza backup
- [ ] Pilot flag attivo in env o DB production

## Scaling progressivo (onboarding utenti)

### Fase 1 — Pilot interno (1–3 utenti admin/manager)

- [ ] Creare account con ruoli definiti in `profiles`
- [ ] Verificare `user_permissions` per moduli necessari
- [ ] Smoke manuale: login, dashboard, report, lavorazioni, documenti
- [ ] Monitoraggio console (vedi [observability-ops.md](../observability-ops.md))

### Fase 2 — Operatori (5–10 utenti)

- [ ] Onboarding per modulo (magazzino, lavorazioni, mezzi, …)
- [ ] Verificare RBAC operatore su route sensibili (`/impostazioni`, `/sicurezza`)
- [ ] Test mobile su dispositivi reali (iOS/Android)
- [ ] Nessun report di hydration mismatch o log storm

### Fase 3 — Full rollout

- [ ] Tutti gli utenti attivi con permessi granulari
- [ ] Portale clienti (se attivo) verificato separatamente
- [ ] `ops:diagnostics` eseguito su DB production (advisory)
- [ ] Post-deploy checklist completata

## Comandi rapidi pre-rollout

```powershell
npm run production:check
$env:PRODUCTION_CHECK_REQUIRE_DB=1; npm run production:check
npm run ops:diagnostics
npm run release:gate
```

## Riferimenti

- [ops-production-checklist.md](../ops-production-checklist.md)
- [release-gate.md](../release-gate.md)
- [PLATFORM_STATUS_REPORT.md](../PLATFORM_STATUS_REPORT.md)
