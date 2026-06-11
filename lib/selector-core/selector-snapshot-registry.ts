/**
 * @advisory v5.3 — versioned snapshot store + pointer-based activation. Node/fs only.
 */
import fs from "node:fs";
import path from "node:path";
import {
  buildSelectorRuntimeSnapshot,
  SELECTOR_BASE_SNAPSHOT_V0,
} from "@/lib/selector-core/selector-config-snapshot";
import {
  atomicPointerActivate,
  atomicPointerRollback,
  atomicWriteJson,
  DEFAULT_POINTER_PATH,
  readPointer,
} from "@/lib/selector-core/selector-snapshot-atomic-switch";
import { syncSnapshotBundle } from "@/lib/selector-core/selector-snapshot-bundle-sync";
import {
  attachSchemaHash,
  validateSnapshot,
} from "@/lib/selector-core/selector-snapshot-schema-validator";
import {
  validateSnapshotSemanticsOrThrow,
} from "@/lib/selector-core/selector-snapshot-semantic-validator";
import type {
  PromotionRegistryState,
  SelectorRuntimeSnapshot,
  SelectorSnapshotManifest,
  SnapshotLifecycleState,
  SnapshotValidationResult,
} from "@/lib/selector-core/types";

export const DEFAULT_SNAPSHOT_STORE_DIR = path.join(
  process.cwd(),
  "docs",
  "selector",
  "snapshots",
);

export const DEFAULT_SNAPSHOT_MANIFEST_PATH = path.join(
  DEFAULT_SNAPSHOT_STORE_DIR,
  "manifest.json",
);

export const DEFAULT_ACTIVE_POINTER_PATH = DEFAULT_POINTER_PATH;

/** @deprecated v5.3 — use DEFAULT_ACTIVE_POINTER_PATH */
export const DEFAULT_ACTIVE_SNAPSHOT_ARTIFACT_PATH = path.join(
  process.cwd(),
  "lib",
  "selector-core",
  "generated",
  "selector-active-snapshot.json",
);

function ensureStoreDir(storeDir = DEFAULT_SNAPSHOT_STORE_DIR): void {
  fs.mkdirSync(storeDir, { recursive: true });
}

function snapshotFilePath(version: string, storeDir = DEFAULT_SNAPSHOT_STORE_DIR): string {
  return path.join(storeDir, `${version}.json`);
}

function defaultLifecycle(): Record<string, SnapshotLifecycleState> {
  return { [SELECTOR_BASE_SNAPSHOT_V0.version]: "active" };
}

function manifestPathForStore(storeDir = DEFAULT_SNAPSHOT_STORE_DIR): string {
  return path.join(storeDir, "manifest.json");
}

export function readManifest(manifestPath = DEFAULT_SNAPSHOT_MANIFEST_PATH): SelectorSnapshotManifest {
  if (!fs.existsSync(manifestPath)) {
    return {
      activeVersion: SELECTOR_BASE_SNAPSHOT_V0.version,
      updatedAt: new Date(0).toISOString(),
      versions: [SELECTOR_BASE_SNAPSHOT_V0.version],
      lifecycle: defaultLifecycle(),
    };
  }
  const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as SelectorSnapshotManifest;
  return {
    ...parsed,
    lifecycle: parsed.lifecycle ?? defaultLifecycle(),
  };
}

export function writeManifest(
  manifest: SelectorSnapshotManifest,
  manifestPath = DEFAULT_SNAPSHOT_MANIFEST_PATH,
): void {
  ensureStoreDir(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function setLifecycleState(
  version: string,
  state: SnapshotLifecycleState,
  storeDir = DEFAULT_SNAPSHOT_STORE_DIR,
): void {
  const manifestPath = manifestPathForStore(storeDir);
  const manifest = readManifest(manifestPath);
  writeManifest(
    {
      ...manifest,
      lifecycle: { ...manifest.lifecycle, [version]: state },
      updatedAt: new Date().toISOString(),
    },
    manifestPath,
  );
}

export function listSnapshots(storeDir = DEFAULT_SNAPSHOT_STORE_DIR): string[] {
  if (!fs.existsSync(storeDir)) return [SELECTOR_BASE_SNAPSHOT_V0.version];
  const files = fs.readdirSync(storeDir).filter((f) => f.endsWith(".json") && f !== "manifest.json");
  return files.map((f) => f.replace(/\.json$/, "")).sort();
}

export function getSnapshot(
  version: string,
  storeDir = DEFAULT_SNAPSHOT_STORE_DIR,
): SelectorRuntimeSnapshot {
  const filePath = snapshotFilePath(version, storeDir);
  if (!fs.existsSync(filePath)) {
    if (version === SELECTOR_BASE_SNAPSHOT_V0.version) return SELECTOR_BASE_SNAPSHOT_V0;
    throw new Error(`Snapshot not found: ${version}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as SelectorRuntimeSnapshot;
}

export function saveSnapshot(
  snapshot: SelectorRuntimeSnapshot,
  storeDir = DEFAULT_SNAPSHOT_STORE_DIR,
  options?: { allowOverwrite?: boolean },
): SelectorRuntimeSnapshot {
  ensureStoreDir(storeDir);
  const validated = attachSchemaHash(snapshot);
  const filePath = snapshotFilePath(validated.version, storeDir);
  if (fs.existsSync(filePath) && !options?.allowOverwrite) {
    throw new Error(`Snapshot already exists (immutable): ${validated.version}`);
  }
  atomicWriteJson(filePath, validated);

  const manifest = readManifest(manifestPathForStore(storeDir));
  const versions = new Set(manifest.versions);
  versions.add(validated.version);
  const lifecycle = { ...manifest.lifecycle, [validated.version]: manifest.lifecycle?.[validated.version] ?? "proposed" };
  writeManifest(
    {
      ...manifest,
      versions: [...versions].sort(),
      lifecycle,
      updatedAt: new Date().toISOString(),
    },
    manifestPathForStore(storeDir),
  );
  return validated;
}

export function validateSnapshotVersion(
  version: string,
  storeDir = DEFAULT_SNAPSHOT_STORE_DIR,
  registry?: Pick<PromotionRegistryState, "proposals">,
): SnapshotValidationResult {
  const snapshot = getSnapshot(version, storeDir);
  const result = validateSnapshot(snapshot, { registry });
  const manifest = readManifest(manifestPathForStore(storeDir));
  const baselineVersion = manifest.activeVersion || SELECTOR_BASE_SNAPSHOT_V0.version;
  if (baselineVersion && baselineVersion !== version) {
    const baseline = getSnapshot(baselineVersion, storeDir);
    validateSnapshotSemanticsOrThrow(snapshot, baseline);
  }
  setLifecycleState(version, "validated", storeDir);
  return result;
}

export function stageSnapshot(
  version: string,
  storeDir = DEFAULT_SNAPSHOT_STORE_DIR,
  registry?: Pick<PromotionRegistryState, "proposals">,
): SelectorRuntimeSnapshot {
  validateSnapshotVersion(version, storeDir, registry);
  setLifecycleState(version, "staged", storeDir);
  syncSnapshotBundle(storeDir);
  return getSnapshot(version, storeDir);
}

export function activateSnapshot(
  version: string,
  storeDir = DEFAULT_SNAPSHOT_STORE_DIR,
  pointerPath = DEFAULT_ACTIVE_POINTER_PATH,
): SelectorRuntimeSnapshot {
  const manifest = readManifest(manifestPathForStore(storeDir));
  const lifecycle = manifest.lifecycle?.[version];
  if (lifecycle !== "staged" && lifecycle !== "validated" && lifecycle !== "active") {
    throw new Error(`Snapshot ${version} must be staged or validated before activation (state: ${lifecycle ?? "unknown"})`);
  }

  getSnapshot(version, storeDir);
  syncSnapshotBundle(storeDir);
  atomicPointerActivate(version, pointerPath);

  const versions = new Set(manifest.versions);
  versions.add(version);
  const nextLifecycle: Record<string, SnapshotLifecycleState> = { ...manifest.lifecycle };
  for (const v of Object.keys(nextLifecycle)) {
    if (nextLifecycle[v] === "active") nextLifecycle[v] = "staged";
  }
  nextLifecycle[version] = "active";

  writeManifest(
    {
      activeVersion: version,
      updatedAt: new Date().toISOString(),
      versions: [...versions].sort(),
      lifecycle: nextLifecycle,
    },
    manifestPathForStore(storeDir),
  );

  return getSnapshot(version, storeDir);
}

export function rollbackSnapshot(
  pointerPath = DEFAULT_ACTIVE_POINTER_PATH,
  storeDir = DEFAULT_SNAPSHOT_STORE_DIR,
): SelectorRuntimeSnapshot {
  const pointer = atomicPointerRollback(pointerPath);
  const manifest = readManifest(manifestPathForStore(storeDir));
  const nextLifecycle: Record<string, SnapshotLifecycleState> = { ...manifest.lifecycle };
  for (const v of Object.keys(nextLifecycle)) {
    if (nextLifecycle[v] === "active") nextLifecycle[v] = "staged";
  }
  nextLifecycle[pointer.activeVersion] = "active";
  writeManifest(
    {
      ...manifest,
      activeVersion: pointer.activeVersion,
      updatedAt: new Date().toISOString(),
      lifecycle: nextLifecycle,
    },
    manifestPathForStore(storeDir),
  );
  return getSnapshot(pointer.activeVersion, storeDir);
}

/** @deprecated v5.3 — use rollbackSnapshot() */
export function rollbackToSnapshot(
  version: string,
  storeDir = DEFAULT_SNAPSHOT_STORE_DIR,
  pointerPath = DEFAULT_ACTIVE_POINTER_PATH,
): SelectorRuntimeSnapshot {
  getSnapshot(version, storeDir);
  syncSnapshotBundle(storeDir);
  atomicPointerActivate(version, pointerPath);
  return activateSnapshot(version, storeDir, pointerPath);
}

export type BuildAndPublishOptions = {
  storeDir?: string;
  pointerPath?: string;
  version?: string;
  registry?: PromotionRegistryState;
};

export function buildAndPublishSnapshot(
  registry: PromotionRegistryState,
  options: BuildAndPublishOptions = {},
): SelectorRuntimeSnapshot {
  const storeDir = options.storeDir ?? DEFAULT_SNAPSHOT_STORE_DIR;
  const pointerPath = options.pointerPath ?? DEFAULT_ACTIVE_POINTER_PATH;
  const snapshot = attachSchemaHash(
    buildSelectorRuntimeSnapshot(registry, { version: options.version }),
  );
  validateSnapshot(snapshot, { registry: options.registry ?? registry });

  const filePath = snapshotFilePath(snapshot.version, storeDir);
  if (fs.existsSync(filePath)) {
    const existing = getSnapshot(snapshot.version, storeDir);
    if (JSON.stringify(existing) !== JSON.stringify(snapshot)) {
      throw new Error(`Snapshot ${snapshot.version} exists with different content (immutable)`);
    }
  } else {
    saveSnapshot(snapshot, storeDir);
  }

  validateSnapshotVersion(snapshot.version, storeDir, registry);
  stageSnapshot(snapshot.version, storeDir, registry);
  return activateSnapshot(snapshot.version, storeDir, pointerPath);
}

export function seedBaseSnapshots(
  storeDir = DEFAULT_SNAPSHOT_STORE_DIR,
  pointerPath = DEFAULT_ACTIVE_POINTER_PATH,
): SelectorRuntimeSnapshot {
  ensureStoreDir(storeDir);
  const seeded = attachSchemaHash(SELECTOR_BASE_SNAPSHOT_V0);
  saveSnapshot(seeded, storeDir, { allowOverwrite: true });
  syncSnapshotBundle(storeDir);
  atomicWriteJson(pointerPath, {
    activeVersion: SELECTOR_BASE_SNAPSHOT_V0.version,
    previousVersion: SELECTOR_BASE_SNAPSHOT_V0.version,
    status: "stable",
    updatedAt: 0,
  });
  writeManifest(
    {
      activeVersion: SELECTOR_BASE_SNAPSHOT_V0.version,
      updatedAt: new Date().toISOString(),
      versions: [SELECTOR_BASE_SNAPSHOT_V0.version],
      lifecycle: { [SELECTOR_BASE_SNAPSHOT_V0.version]: "active" },
    },
    manifestPathForStore(storeDir),
  );
  return seeded;
}

/** @deprecated v5.3 */
export function writeActiveSnapshotArtifact(): never {
  throw new Error("writeActiveSnapshotArtifact removed in v5.3 — use pointer activation");
}

/** @deprecated v5.3 */
export function readActiveSnapshotArtifact(
  artifactPath = DEFAULT_ACTIVE_SNAPSHOT_ARTIFACT_PATH,
): SelectorRuntimeSnapshot | null {
  if (!fs.existsSync(artifactPath)) return null;
  return JSON.parse(fs.readFileSync(artifactPath, "utf8")) as SelectorRuntimeSnapshot;
}

export { readPointer };
