import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

assert.ok(fs.existsSync(path.join(ROOT, "docs/render-path-simplification.md")), "render-path doc missing");

const registry = read("lib/render/query-ownership-registry.ts");
assert.match(registry, /SERVER_OWNER/);
assert.match(registry, /CLIENT_OWNER/);
assert.match(registry, /HYBRID_OWNER/);

const factory = read("lib/render/query-key-factory.ts");
assert.match(factory, /mezziListQueryKey/);
assert.match(factory, /magazzinoListQueryKey/);

const orchestrator = read("lib/render/render-path-orchestrator.ts");
assert.match(orchestrator, /resolveInitialLoad/);

const prefetch = read("src/lib/react-query/prefetch-gestionale-page.ts");
assert.match(prefetch, /query-key-factory|render-path-orchestrator/);
assert.doesNotMatch(prefetch, /\[\.\.\.QK\.mezzi,\s*"list",\s*null\]/);

const lavView = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
assert.doesNotMatch(lavView, /\[\.\.\.QK\.mezzi,\s*null\]/);

const magCache = read("lib/magazzino/magazzino-list-cache.ts");
assert.match(magCache, /query-key-factory/);

const hydrationAudit = read("lib/render/hydration-consistency-audit.ts");
assert.match(hydrationAudit, /recordHydrationQueryFetch/);

const config = read("lib/observability/config.ts");
assert.match(config, /isHydrationConsistencyAuditEnabled/);
assert.match(config, /NODE_ENV === "production"/);

const devMounts = read("components/gestionale/dev-audit-mounts.tsx");
assert.match(devMounts, /HydrationConsistencyDebugMount/);

const mezziService = read("src/services/mezzi.service.ts");
assert.match(mezziService, /fetchMezziListRows/);

console.log("render-path-policy: OK");
