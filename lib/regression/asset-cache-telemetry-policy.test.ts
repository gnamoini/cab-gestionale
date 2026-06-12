import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

assert.ok(
  fs.existsSync(path.join(ROOT, "docs/cache-hit-ratio-optimization.md")),
  "cache-hit-ratio-optimization doc missing",
);

const telemetry = read("lib/observability/asset-cache-telemetry.ts");
assert.match(telemetry, /recordAssetCacheAccess/);
assert.match(telemetry, /getCacheHitRatio/);
assert.match(telemetry, /ASSET_CACHE_RING_MAX = 200/);
assert.match(telemetry, /printCacheReport/);
assert.match(telemetry, /printAssetHotspots/);

const serverTelemetry = read("lib/observability/asset-cache-telemetry.server.ts");
assert.match(serverTelemetry, /import "server-only"/);
assert.match(serverTelemetry, /recordAssetCacheFromRequest/);

const config = read("lib/observability/config.ts");
assert.match(config, /isAssetCacheTelemetryEnabled/);
assert.match(config, /NODE_ENV === "production"/);

const pdfDeliver = read("lib/pdf-artifacts/pdf-artifact-generate.server.ts");
assert.match(pdfDeliver, /recordAssetCacheAccess/);

const previewDeliver = read("lib/documents/document-preview-deliver.server.ts");
assert.match(previewDeliver, /recordAssetCacheAccess/);

const mediaRoute = read("app/api/media/image/route.ts");
assert.match(mediaRoute, /recordAssetCacheFromRequest/);

const debugMount = read("lib/observability/asset-cache-debug.ts");
assert.match(debugMount, /__GESTIONALE_ASSET_CACHE__/);

const devMounts = read("components/gestionale/dev-audit-mounts.tsx");
assert.match(devMounts, /AssetCacheDebugMount/);

const warmup = read("lib/observability/asset-cache-warmup.ts");
assert.match(warmup, /noteAssetCacheInvalidation/);

const mic = read("lib/cache/minimal-invalidation-contract.ts");
assert.match(mic, /noteAssetCacheInvalidation/);

console.log("asset-cache-telemetry-policy: OK");
