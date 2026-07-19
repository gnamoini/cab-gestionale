# magazzino-compat

## Sunset Status

Current: ACTIVE
Readiness: 30%
Blockers:
- compat-write-gate active
- SSOT migration incomplete

## Current state

Legacy Bucket 3 system still active. Tracked in `lib/observability/legacy-system-registry.ts`.

## Replacement

compat SSOT gate off

## Remaining consumers

```bash
rg -l "magazzino-compat" --glob "*.{ts,tsx}"
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

compat-write-gate bypass review

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

inventory
