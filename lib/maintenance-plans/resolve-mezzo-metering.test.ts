import assert from "node:assert/strict";
import {
  resolveMezzoMeteringFromMeta,
  resolveMezzoMeteringHybrid,
} from "@/lib/maintenance-plans/resolve-mezzo-metering";

const metaOnly = resolveMezzoMeteringFromMeta({ oreKm: 1200, kmFromMeta: 50000 });
assert.equal(metaOnly.ore, 1200);
assert.equal(metaOnly.km, 50000);
assert.equal(metaOnly.source, "mezzo_meta");

const asset = resolveMezzoMeteringHybrid({
  oreKm: 1200,
  kmFromMeta: 40000,
  latestAssetKm: 50100,
  assetLifecycleActive: true,
});
assert.equal(asset.km, 50100);
assert.equal(asset.source, "asset_mileage");
assert.equal(asset.confidence, "high");

const hybrid = resolveMezzoMeteringHybrid({
  oreKm: 800,
  kmFromMeta: null,
  latestAssetKm: 12000,
  assetLifecycleActive: false,
});
assert.equal(hybrid.source, "hybrid");
assert.equal(hybrid.km, 12000);

console.log("resolve-mezzo-metering.test.ts OK");
