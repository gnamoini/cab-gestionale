# Legacy Sunset Process

Centralized process for Bucket 3 legacy system removal. Every system must follow these phases before code deletion.

## Phase 0 — Ownership

- Assign owner (team/domain)
- Define replacement system
- Document rollback plan

## Phase 1 — Telemetry

- Install `trackDeprecatedUsage` on legacy paths
- Register in `lib/observability/legacy-system-registry.ts`
- Baseline hit count in staging

## Phase 2 — Consumer migration

- Migrate all static consumers (grep + import graph)
- Feature flag default ON for replacement in staging
- No new consumers on legacy API

## Phase 3 — Zero-hit verification

- 30-day telemetry window with 0 hits in production
- Flag OFF in production for legacy path
- Consumer grep = 0

## Phase 4 — Removal PR

- Deletion manifest with `audit:removal-manifest:verify`
- `confidenceScore >= 85` per file
- Max 1 domain per PR

## Phase 5 — Post-release validation

- Smoke + RBAC regression
- Rollback test documented
- Update sunset doc status to `DELETED`

---

## Sunset Status template (required in each system doc)

```md
## Sunset Status

Current: ACTIVE | MIGRATION | READY_FOR_DELETE | DELETED
Readiness: 0-100%
Blockers:
-
```

## Exit Evidence checklist (required before Phase 4)

- [ ] Telemetry query attached (0 hits / 30d)
- [ ] Flag state snapshot
- [ ] Consumer grep output
- [ ] Import graph diff
- [ ] Rollback test executed

## Systems

| Doc | System | Owner |
|-----|--------|-------|
| [notifications-dual-write.md](./notifications-dual-write.md) | SSOT v4 dual write | notifications |
| [notifications-localstorage.md](./notifications-localstorage.md) | localStorage inbox | notifications |
| [form-ux-legacy.md](./form-ux-legacy.md) | form-ux legacy | forms |
| [magazzino-compat.md](./magazzino-compat.md) | magazzino compat layer | inventory |
| [mezzi-legacy-attrezzatura.md](./mezzi-legacy-attrezzatura.md) | mezzo_attrezzature v1 | mezzi |
| [preventivi-localstorage.md](./preventivi-localstorage.md) | preventivi localStorage | preventivi |
| [gestionale-dirty-sync.md](./gestionale-dirty-sync.md) | dirty sync refresh | sync |
| [ui-os-backward-adapter.md](./ui-os-backward-adapter.md) | ui-os backward adapter | ui |
| [_legacy-migrations.md](./_legacy-migrations.md) | supabase/_legacy/migrations | platform |
