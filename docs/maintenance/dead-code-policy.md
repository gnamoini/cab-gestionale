# Dead code policy

Policy permanente per deprecazione, telemetry e rimozione codice. Complementa [`maintenance-governance.md`](../maintenance-governance.md).

## Bucket model

| Bucket | Contenuto | Workflow |
|--------|-----------|----------|
| 1 — Dead Code | Nessun consumer statico + 0 runtime hit | Delete con manifest |
| 2 — Deprecated Surface | `@deprecated` con consumer | Migra consumer → delete |
| 3 — Legacy Architecture | Flag/dual-write/compat | Sunset project con owner |

## Classificazione A/B/C/D

| Cat | Definizione | Azione |
|-----|-------------|--------|
| A | 0 consumer statici + 0 runtime hit | Delete candidate |
| B | 0 statici, possibile ref dinamico | Investigate + telemetry |
| C | Consumer attivi | Maintain / migrate |
| D | Comportamento non determinato | Telemetry obbligatoria |

## Ogni `@deprecated` deve avere

- **replacement** — in JSDoc `@deprecated`
- **owner** — team o issue/PR
- **created date** — data introduzione deprecazione
- **removal target** — entro **180 giorni**

Massimo lifetime deprecated: **180 giorni** (poi issue blocking o rimozione).

## Telemetry

Usare `trackDeprecatedUsage()` da [`lib/observability/deprecated-usage.ts`](../lib/observability/deprecated-usage.ts) per:

- fallback path
- adapter legacy
- API legacy ancora raggiungibili

Fallback registrati in [`lib/observability/deprecated-fallback-registry.ts`](../lib/observability/deprecated-fallback-registry.ts).

Sistemi legacy in [`lib/observability/legacy-system-registry.ts`](../lib/observability/legacy-system-registry.ts) — **owner obbligatorio**.

## Tooling

| Script | Uso |
|--------|-----|
| `npm run audit:dead-code` | knip advisory (full repo) |
| `npm run audit:dead-code:delta` | **Blocking PR** — nuovi unused files |
| `npm run audit:import-graph` | Import graph + runtime edges |
| `npm run audit:orphan-hotspots` | Orphan 4-state taxonomy + confidence |
| `npm run audit:barrel-entropy` | Barrel public API protection |
| `npm run audit:debt-score` | Technical Debt Score + trend history |
| `npm run audit:removal-manifest:verify` | Manifest integrity pre-delete |
| `npm run audit:unused-ts` | Report-only unused locals |

**knip:** mai blocking sullo storico; solo delta PR.

## Phase 9 — Orphan taxonomy

| Stato | Criterio |
|-------|----------|
| `deadCandidate` | 0 static inbound + 0 runtime edge |
| `runtimeOnly` | 0 `importedBy`, ≥1 runtime edge inbound |
| `entryOnly` | entry point senza consumer |
| `unknown` | partial resolution |

### confidenceScore (0–100)

| Evidenza | Peso |
|----------|-----:|
| knip unused | +25 |
| import inbound = 0 | +25 |
| grep reference = 0 | +20 |
| runtime edge = 0 | +20 |
| dynamic risk | −40 |
| registry-adjacent dir | −20 |

| Score | Azione |
|------:|--------|
| ≥ 85 | safe delete candidate |
| 50–84 | manual review |
| < 50 | no delete |

## RBAC regression gate

Prima di attribuire FAIL al cleanup: baseline comparator in `artifacts/audit/rbac-rca/` (`environment.txt`, `fixtures-snapshot.json`, `root-cause.md`). `smoke:regression:core` deve essere verde prima di sunset Bucket 3.

## Sunset process

[`docs/migrations/sunset/README.md`](../migrations/sunset/README.md) — 8 legacy systems + Exit Evidence checklist.

## Deletion manifest (v2)

```json
{
  "batchId": "batch-003",
  "phase": "phase9",
  "removedFiles": [{
    "path": "components/foo.tsx",
    "previousHash": "abc123",
    "consumerCount": 0,
    "confidenceScore": 95,
    "evidence": ["knip:file-unused", "importGraph:0-inbound"]
  }]
}
```

```
npm run audit:removal-manifest -- --batch batch-NNN --paths "path1"
npm run audit:removal-manifest:verify
```

## Technical Debt Score

```
score = files*1 + deprecatedExports*2 + legacyFlags*5 + fallbackPaths*3 + orphanNodes*1
```

Trend history: `artifacts/audit/dead-code-baseline/debt-score-trend.json`

## Riferimenti

- Audit completo: [`docs/audit/DEPRECATED_CODE_AUDIT.md`](../audit/DEPRECATED_CODE_AUDIT.md)
- Hotspots Phase 9: [`docs/audit/DEAD_CODE_HOTSPOTS.md`](../audit/DEAD_CODE_HOTSPOTS.md)
- Loading policy: [`docs/performance/loading-policy.md`](../performance/loading-policy.md)
