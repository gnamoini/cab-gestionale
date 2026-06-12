import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

assert.ok(
  fs.existsSync(path.join(ROOT, "docs/query-deduplication-strategy.md")),
  "query-deduplication-strategy doc missing",
);

const registry = read("lib/query/query-dedup-registry.ts");
assert.match(registry, /buildDedupKey/);
assert.match(registry, /clearDedupForEntity/);
assert.match(registry, /registerInFlight/);

const dedupQuery = read("lib/query/dedup-query.ts");
assert.match(dedupQuery, /export async function dedupQuery/);

const useServiceQuery = read("src/hooks/use-service-query.ts");
assert.match(useServiceQuery, /dedupQuery/);

const sharedHook = read("src/hooks/use-shared-entity-query.ts");
assert.match(sharedHook, /useSharedEntityQuery/);
assert.match(sharedHook, /shouldSkipClientInitialFetch/);

const audit = read("lib/observability/query-dedup-audit.ts");
assert.match(audit, /recordDedupHit/);
assert.match(audit, /recordDedupMiss/);

const config = read("lib/observability/config.ts");
assert.match(config, /isQueryDedupAuditEnabled/);
assert.match(config, /NODE_ENV === "production"/);

const debugMount = read("lib/observability/query-dedup-debug.ts");
assert.match(debugMount, /__GESTIONALE_QUERY_DEDUP__/);

const devMounts = read("components/gestionale/dev-audit-mounts.tsx");
assert.match(devMounts, /QueryDedupDebugMount/);

const lavDomain = read("src/services/domain/lavorazioni-domain.queries.ts");
assert.match(lavDomain, /useSharedEntityQuery/);

const mezzoDomain = read("src/services/domain/mezzo-domain.queries.ts");
assert.match(mezzoDomain, /useSharedEntityQuery/);

const settings = read("src/hooks/gestionale/use-settings-queries.ts");
assert.match(settings, /dedupQuery/);

const costo = read("src/hooks/gestionale/use-lavorazione-costo.ts");
assert.match(costo, /getQueryData/);

const invalidateTargets = read("src/lib/react-query/invalidate-targets.ts");
assert.match(invalidateTargets, /clearDedupAfterInvalidation/);

const smokeLists = read("lib/regression/smoke-regression-lists.ts");
assert.match(smokeLists, /query-dedup-policy\.test\.ts/);

console.log("query-dedup-policy: OK");
