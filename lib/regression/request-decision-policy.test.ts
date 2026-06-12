import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

assert.ok(
  fs.existsSync(path.join(ROOT, "docs/request-decision-registry.md")),
  "request-decision-registry doc missing",
);

const registry = read("lib/decision/request-decision-registry.ts");
assert.match(registry, /getCachePolicy/);
assert.match(registry, /getRouteClassification/);
assert.match(registry, /getAssetDeliveryStrategy/);
assert.match(registry, /shouldBypassCache/);
assert.match(registry, /getAuthPrecheckStrategy/);

const context = read("lib/decision/request-context.ts");
assert.match(context, /buildRequestContextFromEdge/);
assert.match(context, /buildRequestContextFromServer/);
assert.match(context, /buildRequestContextFromClientPath/);

const docValidator = read("lib/edge/validators/document-route-params.ts");
assert.match(docValidator, /getAssetDeliveryStrategy/);

const mediaValidator = read("lib/edge/validators/media-path.ts");
assert.match(mediaValidator, /getCachePolicy/);

const mediaRoute = read("app/api/media/image/route.ts");
assert.match(mediaRoute, /getCachePolicy/);
assert.doesNotMatch(mediaRoute, /edgePolicy\s*===/);

const docRoute = read("app/api/documents/[id]/route.ts");
assert.match(docRoute, /recordDecisionAlignment/);
assert.match(docRoute, /getAssetDeliveryStrategy/);

const audit = read("lib/observability/request-decision-audit.ts");
assert.match(audit, /recordDecisionMismatch/);

const config = read("lib/observability/config.ts");
assert.match(config, /isRequestDecisionAuditEnabled/);
assert.match(config, /NODE_ENV === "production"/);

const debugMount = read("lib/observability/request-decision-debug.ts");
assert.match(debugMount, /__REQUEST_DECISION_AUDIT__/);

const devMounts = read("components/gestionale/dev-audit-mounts.tsx");
assert.match(devMounts, /RequestDecisionDebugMount/);

const edgeRouter = read("src/middleware/edge-router.ts");
assert.match(edgeRouter, /getRouteClassification/);
assert.match(edgeRouter, /X-RDR-Route-Class/);

const smokeLists = read("lib/regression/smoke-regression-lists.ts");
assert.match(smokeLists, /request-decision-policy\.test\.ts/);

console.log("request-decision-policy: OK");
