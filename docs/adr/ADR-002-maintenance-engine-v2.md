# ADR-002 — Maintenance Planning Engine v2

## Status

Accepted — 2026-10-20

## Context

Il dominio tagliandi v1 (`maintenance_plans`) era un MVP matriciale ore-based con piano implicito per tipo attrezzatura. Serviva separare configurazione, esecuzione e previsione; supportare multi-piano per mezzo; introdurre forecast EMA server-side.

## Decision

1. **Schema additive** su `maintenance_plans` / `vehicle_maintenance_services` con nuove tabelle `vehicle_maintenance_configs`, `maintenance_preset_versions`, `vehicle_maintenance_forecasts`, `vehicle_maintenance_forecast_history`.
2. **Multi-piano**: N `vehicle_maintenance_configs` per mezzo; unique `(mezzo_id, preset_id)` e `(mezzo_id, maintenance_kind)` per custom.
3. **Forecast**: calcolo EMA in `lib/maintenance-plans/forecast/` — mai lato client; materializzato in DB.
4. **Notifiche dual-track**: `tagliando_da_eseguire` (event) + `tagliando_previsto_7g` (cron).
5. **Feature flag**: `NEXT_PUBLIC_MAINTENANCE_ENGINE_V2=0` per rollback UI.

## Consequences

- Migrazione incrementale con backfill preset versions e configs da `meta.tagliandi`.
- Matrice 500h resta disponibile con flag v2 off.
- Port stub per magazzino e pianificazione officina.
