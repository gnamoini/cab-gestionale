# Maintenance Planning Engine v2

Dominio operativo tagliandi (ore/km/giorni) separato da `asset_compliance`.

## Moduli

| Path | Ruolo |
|------|-------|
| `lib/maintenance-plans/` | Pure logic, forecast EMA, KPI selectors |
| `src/services/maintenance-engine-v2.service.ts` | CRUD configs, overview, executions |
| `src/services/maintenance-plans.service.ts` | v1 compat |
| `lib/domain/maintenance-plans-entry.ts` | RBAC boundary |

## Feature flag

- `NEXT_PUBLIC_MAINTENANCE_ENGINE_V2=0` — kill switch emergenza (rollback matrice 500h v1)
- `app_settings` `system.maintenance_engine_v2` — `enabled`, `percentage`, `allowed_roles` (vedi `lib/officina/maintenance-engine-v2-flag.ts`)

## SSOT metering

`resolveCurrentMezzoMetering(mezzoId)` in `lib/maintenance-plans/fetch-mezzo-metering.ts` — ore da `mezzi.meta`, km da `asset_mileage_readings` se lifecycle attivo.

## DB

Migrations:

- `20261020120000_maintenance_engine_v2_core.sql`
- `20261020120100_maintenance_engine_v2_rls.sql`
- `20261021120000_maintenance_engine_v2_backfill.sql`
- `20261021120100_register_maintenance_execution_v2_rpc.sql`

Verifica post-backfill: [`scripts/backfill-maintenance-v2-configs.sql`](../../scripts/backfill-maintenance-v2-configs.sql)

## Gate produzione

[`PRODUCTION_GATES.md`](./PRODUCTION_GATES.md)

## Cron

`/api/cron/maintenance-forecast-notify` — notifiche `tagliando_previsto_7g` (06:00 UTC)
