/**
 * v5.3 / v5.3.1 production hardening — schema gate, atomic pointer, lifecycle, runtime loader.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SELECTOR_BASE_SNAPSHOT_V0,
  buildSelectorRuntimeSnapshotDeterministic,
} from "@/lib/selector-core/selector-config-snapshot";
import { loadLatestSelectorSnapshot, resolveEffectiveVersion } from "@/lib/selector-core/selector-config-runtime-loader";
import {
  atomicPointerActivate,
  readPointer,
} from "@/lib/selector-core/selector-snapshot-atomic-switch";
import { syncSnapshotBundle } from "@/lib/selector-core/selector-snapshot-bundle-sync";
import {
  MAX_BUNDLED_SNAPSHOTS,
} from "@/lib/selector-core/selector-snapshot-pruner";
import {
  computeSchemaHash,
  validateSnapshot,
} from "@/lib/selector-core/selector-snapshot-schema-validator";
import {
  isRuntimeSnapshotStructurallyValid,
  validateAtRuntime,
} from "@/lib/selector-core/selector-runtime-sanity-guard";
import {
  activateSnapshot,
  rollbackSnapshot,
  saveSnapshot,
  stageSnapshot,
  writeManifest,
} from "@/lib/selector-core/selector-snapshot-registry";
import type { SelectorRuntimeSnapshot } from "@/lib/selector-core/types";

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "selector-v53-prod-"));
const storeDir = path.join(tmpRoot, "store");
const generatedDir = path.join(tmpRoot, "generated");
const generatedSnapshotsDir = path.join(generatedDir, "snapshots");
const pointerPath = path.join(generatedDir, "pointer.json");
const registryGeneratedPath = path.join(generatedDir, "registry.generated.ts");

// 1. Schema validator rejects invalid snapshot
const invalid: SelectorRuntimeSnapshot = {
  version: "",
  timestamp: Number.NaN,
  config: {
    rolloutByDomain: { unknown_domain: "ENABLED" },
    thresholds: { sheetMinOptions: -1, optionCountBands: [5, 20, 100] },
    defaultBehavior: {
      fallbackSurface: "dropdown",
      mobileSheetEnabled: true,
      defaultMode: "default",
      defaultDomain: "unknown",
    },
  },
  provenance: { appliedProposals: [], ignoredProposals: [], registryVersion: 0 },
};
assert.throws(() => validateSnapshot(invalid), /validation failed/);

// 2. Reproducible schemaHash
const snap = buildSelectorRuntimeSnapshotDeterministic({ version: 1, proposals: [] });
const hash1 = computeSchemaHash(snap);
const hash2 = computeSchemaHash(snap);
assert.equal(hash1, hash2);

// 3. Lifecycle stage → activate
saveSnapshot({ ...SELECTOR_BASE_SNAPSHOT_V0, version: "vA" }, storeDir);
saveSnapshot({ ...SELECTOR_BASE_SNAPSHOT_V0, version: "vB" }, storeDir);
stageSnapshot("vB", storeDir);
atomicPointerActivate("vA", pointerPath);
activateSnapshot("vB", storeDir, pointerPath);
assert.equal(readPointer(pointerPath).activeVersion, "vB");

// 4. Rollback pointer flip
rollbackSnapshot(pointerPath, storeDir);
assert.equal(readPointer(pointerPath).activeVersion, "vA");

// 5. Bundle sync prunes to bounded set
for (let i = 0; i < 8; i += 1) {
  saveSnapshot({ ...SELECTOR_BASE_SNAPSHOT_V0, version: `snap-${i}` }, storeDir);
}
writeManifest(
  {
    activeVersion: "snap-7",
    updatedAt: new Date().toISOString(),
    versions: ["vA", "vB", ...Array.from({ length: 8 }, (_, i) => `snap-${i}`)],
    lifecycle: {},
  },
  path.join(storeDir, "manifest.json"),
);
fs.writeFileSync(
  pointerPath,
  `${JSON.stringify({
    activeVersion: "snap-7",
    previousVersion: "snap-6",
    status: "stable",
    updatedAt: 0,
  }, null, 2)}\n`,
);
const synced = syncSnapshotBundle(
  storeDir,
  generatedSnapshotsDir,
  registryGeneratedPath,
  undefined,
  pointerPath,
  path.join(generatedDir, "selector-bundle-manifest.json"),
  path.join(generatedDir, "selector-rollback-registry.generated.ts"),
);
assert.equal(synced.length, MAX_BUNDLED_SNAPSHOTS);
assert.ok(synced.includes("snap-7"));
assert.ok(synced.includes("snap-6"));

// 6. Runtime loader resolves from bundled registry (project fixture)
const loaded = loadLatestSelectorSnapshot();
assert.equal(loaded.version, "v0");
assert.ok(isRuntimeSnapshotStructurallyValid(loaded));

// 7. Runtime sanity guard fallback
const corrupt = { ...loaded, config: { ...loaded.config, thresholds: { ...loaded.config.thresholds, sheetMinOptions: Number.NaN } } };
const sanity = validateAtRuntime(corrupt, "v0", SELECTOR_BASE_SNAPSHOT_V0, {
  registryKeys: ["v0"],
  registry: { v0: SELECTOR_BASE_SNAPSHOT_V0 },
});
assert.equal(sanity.usedFallback, true);

// 8. resolveEffectiveVersion — dev override vs production ignore
function withProcessEnv(
  overrides: Record<string, string | undefined>,
  run: () => void,
): void {
  const saved = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    saved.set(key, process.env[key]);
    if (value === undefined) Reflect.deleteProperty(process.env, key);
    else Reflect.set(process.env, key, value);
  }
  try {
    run();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) Reflect.deleteProperty(process.env, key);
      else Reflect.set(process.env, key, value);
    }
  }
}

withProcessEnv(
  { NODE_ENV: "development", NEXT_PUBLIC_SELECTOR_ACTIVE_VERSION: "v0" },
  () => {
    assert.equal(resolveEffectiveVersion({ activeVersion: "other" }), "v0");
  },
);
withProcessEnv({ NODE_ENV: "production", NEXT_PUBLIC_SELECTOR_ACTIVE_VERSION: "v0" }, () => {
  assert.equal(resolveEffectiveVersion({ activeVersion: "other" }), "other");
});

fs.rmSync(tmpRoot, { recursive: true, force: true });

console.log("selector-snapshot-production.test.ts OK");
