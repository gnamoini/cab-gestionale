# Pre-deploy checklist

Eseguire **prima** di ogni merge su `main` che porta a production.

## GitHub Actions secrets

- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurato
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurato
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurato (solo Actions, mai Vercel)
- [ ] `SMOKE_ADMIN_EMAIL` / `SMOKE_ADMIN_PASSWORD` configurati
- [ ] (Opzionale) `SMOKE_OPERATOR_*`, `SMOKE_DOCUMENTI_LAVORAZIONE_ID`

Template: [`.env.smoke.example`](../../.env.smoke.example)

## Branch protection

- [ ] Require PR before merge su `main`
- [ ] Require status check **`release-gate`**
- [ ] Require branch up to date (consigliato)
- [ ] Admin bypass disabilitato (se possibile)

## Vercel production settings

- [ ] Production branch = `main`
- [ ] Deployment Protection: attende GitHub check `release-gate`
- [ ] Env production: solo `NEXT_PUBLIC_*` (template [`.env.production.example`](../../.env.production.example))
- [ ] **Assente** `SUPABASE_SERVICE_ROLE_KEY` su Vercel
- [ ] **Assente** `NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS=1`
- [ ] **Assente** `NEXT_PUBLIC_STAGING_PUBLIC=1`
- [ ] Rimossi legacy `GITHUB_TOKEN` / `GITHUB_REPOSITORY` (se presenti)

## Supabase production

- [ ] Backup / PITR abilitato nel dashboard
- [ ] Migration pending applicate:
  - [ ] `20260704120000_bunder_documents.sql`
  - [ ] `20260704130000_deprecate_supporto_tables.sql`
  - [ ] `20260705120000_gestionale_sync_realtime_gaps.sql`
  - [ ] `20260706120000_input_text_limits.sql`
- [ ] Supabase Auth → Redirect URLs include `https://<dominio>/login/reset-password`
- [ ] Bucket `documenti` privato
- [ ] RLS attivo su `user_permissions`, `profiles`, `documenti`, `app_settings`
- [ ] `app_settings.system.enable_operator_global_settings` = **off**
- [ ] Utenti smoke dedicati esistenti (no account produzione reali in CI)

## Gate locali / CI (PR)

- [ ] `npm run ci:tsc` — PASS
- [ ] `npm run ci:build` — PASS
- [ ] `npm run ux:enforce` — PASS
- [ ] `npm run ux:mobile-gate` — PASS
- [ ] `npm run smoke:structural` — PASS
- [ ] `npm run smoke:regression` — PASS
- [ ] `npm run production:check` con DB — PASS in CI
- [ ] `npm run smoke:playwright` — PASS in CI

## Backup (se migration inclusa nel deploy)

- [ ] Export SQL o snapshot Supabase prima di migration distruttiva
- [ ] Rollback SQL preparato (se applicabile)
- [ ] Verificare migration in `supabase/migrations/` con naming timestamp

## Smoke credentials

- [ ] Admin smoke: login testato manualmente o via CI verde
- [ ] Operator smoke (opzionale): permessi DB allineati a spec RBAC
- [ ] Documenti smoke (opzionale): `SMOKE_DOCUMENTI_LAVORAZIONE_ID` valido

## Release-gate assumptions

- [ ] CI imposta `PRODUCTION_CHECK_REQUIRE_DB=1`
- [ ] Fork PR: gate skipped by design (no secrets)
- [ ] Vercel esegue **solo** `next build` — gate solo su GitHub

## Comandi verifica locale (con secrets)

```powershell
$env:PRODUCTION_CHECK_REQUIRE_DB=1; npm run production:check
$env:OPS_DIAGNOSTICS_REQUIRE_DB=1; npm run ops:diagnostics
npm run release:gate
```

## Post-deploy verify (input security + sync)

- [ ] `npm run audit:rls` — PASS
- [ ] Smoke manuale: recovery password → `/login/reset-password` → nuova password
- [ ] Smoke BUNDER persist (migration `bunder_documents`)
- [ ] Realtime dipendenti/permissions attivo (migration sync gaps)

- [rollout-checklist.md](./rollout-checklist.md)
- [release-gate.md](../release-gate.md)
