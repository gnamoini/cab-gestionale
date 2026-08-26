# Disaster Recovery Runbook — Gestionale CAB

**Owner:** Platform / DevOps  
**Last updated:** 2026-08-27  
**RPO target:** 24h (Supabase daily backup; PITR if Pro)  
**RTO target:** 4h (full stack restore + smoke)

## Scope

This runbook covers **DB**, **Storage**, **Auth**, **Vercel deploy**, **secrets**, and **post-restore smoke**.

DB restore alone is **not** full DR.

## 1. Incident declaration

1. Confirm outage scope (app, DB, storage, auth, email).
2. Open incident channel; assign IC + comms.
3. Capture `schema_migrations` max version and last known good deploy SHA.

## 2. Database restore (Supabase)

1. Supabase Dashboard → Project → Database → Backups.
2. Choose PITR point or daily snapshot **before** corruption time.
3. Restore to **new branch** first if available; otherwise in-place restore (requires maintenance window).
4. After restore:
   - `select max(version) from supabase_migrations.schema_migrations;`
   - Re-run security baseline export: `npx tsx scripts/export-security-catalog-baseline.ts --out docs/security/baseline-post-restore.json`
   - Run LIVE P0 gate with `ENFORCE_LIVE_P0_GATE=1`.

## 3. Storage restore

1. Inventory buckets: documents, captures, branding, import temp paths.
2. Restore from Supabase Storage backup or object replication if configured.
3. Verify RLS path policies with `security-storage-object-boundary` regression.

## 4. Auth recovery

1. Supabase Auth users persist in `auth.users` — restored with DB.
2. **Sessions:** users must re-login after major restore (JWT refresh invalid).
3. Rotate `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` if compromise suspected.

## 5. Secrets & env (Vercel + Supabase)

| Secret | Location |
|--------|----------|
| `DATABASE_URL` / Supabase keys | Vercel env + Supabase API settings |
| `RESEND_WEBHOOK_SECRET` | Vercel |
| `CRON_SECRET` | Vercel |
| AI provider keys | Supabase `ai_provider_keys` + Vercel |

Export env list from Vercel project before restore; re-apply after new project link if needed.

## 6. Deployment recovery

1. Promote last known good Vercel deployment or redeploy `main` at verified SHA.
2. Ensure migrations parity: `npx tsx scripts/security-remediation-preflight.ts`
3. Do **not** deploy app before LIVE P0 GATE passes on restored DB.

## 7. Post-restore smoke checklist

- [ ] Login (staff + cliente portal)
- [ ] Stock adjust / scarico idempotent retry
- [ ] Invoice status transition (canonical RPC)
- [ ] Communication send (dry-run or test recipient)
- [ ] AI part search enqueue → cron worker claim
- [ ] Webhook Resend signature (503 if secret missing)

## 8. Escalation

1. On-call engineer → Tech lead → Supabase support (Pro) for PITR assist.

## 9. Restore test cadence

- **Staging branch restore:** quarterly (or document Hobby plan blocker).
- Record result in `docs/security/adversarial-regression-2026-08-27.json` appendix.
