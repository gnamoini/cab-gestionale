# notifications-localstorage

## Sunset Status

Current: MIGRATION
Readiness: 55%
Blockers:
- DB inbox v2 not default
- localStorage consumers remain

## Current state

Legacy Bucket 3 system still active. Tracked in `lib/observability/legacy-system-registry.ts`.

## Replacement

DB inbox v2

## Remaining consumers

```bash
rg -l "notifications-localstorage" --glob "*.{ts,tsx}"
```

Run `npm run audit:import-graph` and inspect runtime edges.

## Telemetry

- `trackDeprecatedUsage` on legacy entry paths
- Event: `deprecated.usage` with `meta.deprecatedPath`

## Migration steps

1. Enable replacement via feature flag in staging
2. Migrate consumers (grep + import graph)
3. 30-day zero-hit window in production
4. Flag OFF legacy path
5. Removal PR with `audit:removal-manifest:verify`

## Rollback plan

NEXT_PUBLIC_NOTIFICATIONS_V2=off

## Delete criteria

- Telemetry = 0 hits / 30 days
- Feature flag OFF in production
- Consumer grep = 0
- Import graph shows no inbound edges

## Exit Evidence

- [ ] Telemetry query attached
- [ ] Flag state snapshot
- [ ] Consumer grep output
- [ ] Import graph diff
- [ ] Rollback test

## Owner

notifications
