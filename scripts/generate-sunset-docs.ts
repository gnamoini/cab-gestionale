import fs from "node:fs";
import path from "node:path";
import { LEGACY_SYSTEM_REGISTRY } from "../lib/observability/legacy-system-registry";

const STATUS: Record<
  string,
  { current: string; readiness: number; blockers: string[] }
> = {
  "notifications-dual-write": {
    current: "MIGRATION",
    readiness: 65,
    blockers: ["dual write telemetry still active", "flag OFF pending in prod"],
  },
  "notifications-localstorage": {
    current: "MIGRATION",
    readiness: 55,
    blockers: ["DB inbox v2 not default", "localStorage consumers remain"],
  },
  "form-ux-legacy": {
    current: "MIGRATION",
    readiness: 40,
    blockers: ["NEXT_PUBLIC_FORM_UX_MIGRATION partial rollout"],
  },
  "magazzino-compat": {
    current: "ACTIVE",
    readiness: 30,
    blockers: ["compat-write-gate active", "SSOT migration incomplete"],
  },
  "mezzi-legacy-attrezzatura": {
    current: "MIGRATION",
    readiness: 50,
    blockers: ["v2 flag not default in prod"],
  },
  "preventivi-localstorage": {
    current: "MIGRATION",
    readiness: 45,
    blockers: ["DB primary flag pending"],
  },
  "gestionale-dirty-sync": {
    current: "ACTIVE",
    readiness: 25,
    blockers: ["version-bump refresh not universal"],
  },
  "ui-os-backward-adapter": {
    current: "MIGRATION",
    readiness: 35,
    blockers: ["ui-os-engine partial adoption"],
  },
};

const dir = path.join(process.cwd(), "docs/migrations/sunset");
fs.mkdirSync(dir, { recursive: true });

for (const sys of LEGACY_SYSTEM_REGISTRY) {
  const st = STATUS[sys.name] ?? {
    current: "ACTIVE",
    readiness: 0,
    blockers: ["classification pending"],
  };
  const body = `# ${sys.name}

## Sunset Status

Current: ${st.current}
Readiness: ${st.readiness}%
Blockers:
${st.blockers.map((b) => `- ${b}`).join("\n")}

## Current state

Legacy Bucket 3 system still active. Tracked in \`lib/observability/legacy-system-registry.ts\`.

## Replacement

${sys.replacement}

## Remaining consumers

\`\`\`bash
rg -l "${sys.name}" --glob "*.{ts,tsx}"
\`\`\`

Run \`npm run audit:import-graph\` and inspect runtime edges.

## Telemetry

- \`trackDeprecatedUsage\` on legacy entry paths
- Event: \`deprecated.usage\` with \`meta.deprecatedPath\`

## Migration steps

1. Enable replacement via feature flag in staging
2. Migrate consumers (grep + import graph)
3. 30-day zero-hit window in production
4. Flag OFF legacy path
5. Removal PR with \`audit:removal-manifest:verify\`

## Rollback plan

${sys.rollbackPlan}

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

${sys.owner}
`;
  fs.writeFileSync(path.join(dir, `${sys.name}.md`), body);
}

fs.writeFileSync(
  path.join(dir, "_legacy-migrations.md"),
  `# supabase/_legacy/migrations

## Sunset Status

Current: ACTIVE
Readiness: 0%
Blockers:
- Archive classification only — no deploy path

## Classification

| Property | Value |
|----------|-------|
| deployable | no |
| referenced by CI | no |
| referenced by docs | partial |
| archive owner | platform (TBD) |

Do not delete without DBA + platform review.
`,
);

console.log(`wrote ${LEGACY_SYSTEM_REGISTRY.length + 1} sunset docs`);
