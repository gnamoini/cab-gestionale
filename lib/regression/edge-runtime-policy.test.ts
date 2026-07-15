import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

assert.ok(
  fs.existsSync(path.join(ROOT, "docs/edge-functions-architecture.md")),
  "edge-functions-architecture doc missing",
);

const registry = read("lib/edge/edge-function-registry.ts");
assert.match(registry, /matchEdgeRoute/);
assert.match(registry, /matchAuthPrecheckRoute/);
assert.match(registry, /NON_EDGE_PREFIXES/);

const handlers = [
  "lib/edge/handlers/auth-precheck-edge.ts",
  "lib/edge/handlers/document-route-edge.ts",
  "lib/edge/handlers/media-cache-edge.ts",
  "lib/edge/handlers/upload-policy-precheck-edge.ts",
];
for (const h of handlers) {
  assert.ok(fs.existsSync(path.join(ROOT, h)), `${h} missing`);
}

const validators = [
  "lib/edge/validators/upload-policy-schema.ts",
  "lib/edge/validators/document-route-params.ts",
  "lib/edge/validators/media-path.ts",
];
for (const v of validators) {
  assert.ok(fs.existsSync(path.join(ROOT, v)), `${v} missing`);
}

const edgeRouter = read("src/middleware/edge-router.ts");
assert.match(edgeRouter, /tryEdgeRoute/);
assert.match(edgeRouter, /tryAuthPrecheckEdge/);

const proxyHandler = read("src/middleware/proxy-handler.ts");
assert.match(proxyHandler, /isCronApiPath/);
assert.match(proxyHandler, /\/api\/cron\//);
assert.match(proxyHandler, /tryAuthPrecheckEdge/);
assert.match(proxyHandler, /tryEdgeRoute/);

const tracer = read("lib/observability/edge-runtime-tracer.ts");
assert.match(tracer, /recordEdgeRuntimeEvent/);
assert.match(tracer, /edge_hit/);

const config = read("lib/observability/config.ts");
assert.match(config, /isEdgeLayerEnabled/);
assert.match(config, /isEdgeRouteGroupEnabled/);
assert.match(config, /isEdgeRuntimeTraceEnabled/);
assert.match(config, /NODE_ENV === "production"/);

const debugMount = read("lib/observability/edge-runtime-debug.ts");
assert.match(debugMount, /__EDGE_RUNTIME_STATS__/);

const devMounts = read("components/gestionale/dev-audit-mounts.tsx");
assert.match(devMounts, /EdgeRuntimeDebugMount/);

const uploadRoute = read("app/api/documents/upload-policy/route.ts");
assert.match(uploadRoute, /validateUploadPolicyBody/);

const mediaRoute = read("app/api/media/image/route.ts");
assert.match(mediaRoute, /validateMediaImagePath/);

const smokeLists = read("lib/regression/smoke-regression-lists.ts");
assert.match(smokeLists, /edge-runtime-policy\.test\.ts/);

console.log("edge-runtime-policy: OK");
