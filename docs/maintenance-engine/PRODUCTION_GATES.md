# Maintenance Engine v2 — Gate produzione

Checklist da eseguire su **staging** prima del cutover in produzione.

| Gate | Comando / azione | Esito |
|------|------------------|-------|
| Migration applied staging | `supabase db push` + verifica migration `20261021120000`, `20261021120100` | ⬜ |
| SQL duplicati config | [`scripts/backfill-maintenance-v2-configs.sql`](../../scripts/backfill-maintenance-v2-configs.sql) | ⬜ |
| `config_id` su storico | `SELECT COUNT(*) FROM vehicle_maintenance_services WHERE config_id IS NULL AND plan_id IS NOT NULL` → 0 | ⬜ |
| Reconciliation 10 mezzi | Confronto forecast v2 vs matrice v1 su 10 mezzi reali | ⬜ |
| SSOT metering | 3 mezzi: meta-only, asset_mileage attivo, hybrid | ⬜ |
| Forecast scenari A/B/C | `npx tsx lib/maintenance-plans/forecast/ema-forecast.scenarios.test.ts` | ⬜ |
| Cron idempotenza | Doppia invoke `POST /api/cron/maintenance-forecast-notify` stesso giorno → 1 notifica | ⬜ |
| RBAC matrix | Admin/Manager/Operatore/Cliente su config CRUD + register + recompute | ⬜ |
| Flag rollback | `NEXT_PUBLIC_MAINTENANCE_ENGINE_V2=0` → hub matrice v1 | ⬜ |
| Performance 500 mezzi | `npx tsx scripts/bench-maintenance-engine.ts` su staging | ⬜ |

## Rollback

1. Env `NEXT_PUBLIC_MAINTENANCE_ENGINE_V2=0`
2. Opzionale: `app_settings` `maintenance_engine_v2.enabled = false`

I dati v2 (configs, forecasts, history) restano in DB — nessuna perdita.
