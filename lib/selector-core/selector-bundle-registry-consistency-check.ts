/**
 * @advisory v5.3.1 — store / bundle / registry.generated consistency enforcer. Node/fs only.
 */
import fs from "node:fs";
import path from "node:path";
import { readPointer, DEFAULT_POINTER_PATH } from "@/lib/selector-core/selector-snapshot-atomic-switch";
import { computeSchemaHash } from "@/lib/selector-core/selector-snapshot-schema-validator";
import type { SelectorRuntimeSnapshot, SelectorSnapshotPointer } from "@/lib/selector-core/types";

const DEFAULT_SNAPSHOT_STORE_DIR = path.join(
  process.cwd(),
  "docs",
  "selector",
  "snapshots",
);

const DEFAULT_GENERATED_DIR = path.join(
  process.cwd(),
  "lib",
  "selector-core",
  "generated",
);

export const DEFAULT_GENERATED_SNAPSHOTS_DIR = path.join(
  DEFAULT_GENERATED_DIR,
  "snapshots",
);

export const DEFAULT_SNAPSHOT_REGISTRY_GENERATED_PATH = path.join(
  DEFAULT_GENERATED_DIR,
  "selector-snapshot-registry.generated.ts",
);

export const DEFAULT_BUNDLE_MANIFEST_PATH = path.join(
  DEFAULT_GENERATED_DIR,
  "selector-bundle-manifest.json",
);

export type SelectorBundleManifest = {
  versions: string[];
  schemaHashes: Record<string, string>;
  generatedAt: string;
  /** v5.3.2 — pointer epoch for runtime cache invalidation */
  pointerEpoch?: {
    activeVersion: string;
    previousVersion: string;
    updatedAt: number;
  };
  /** v5.3.2 — rollback-only bundled versions */
  rollbackVersions?: string[];
};

export type BundleRegistryConsistencyResult = {
  consistent: boolean;
  missingInBundle: string[];
  extraInBundle: string[];
  registryDrift: string[];
  hashMismatch: string[];
  pointerIssues: string[];
};

export type BundleRegistryConsistencyOptions = {
  storeDir?: string;
  generatedSnapshotsDir?: string;
  registryGeneratedPath?: string;
  pointerPath?: string;
  bundledVersions?: string[];
};

function listBundleFiles(generatedSnapshotsDir: string): string[] {
  if (!fs.existsSync(generatedSnapshotsDir)) return [];
  return fs
    .readdirSync(generatedSnapshotsDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/, ""));
}

function parseRegistryKeys(registryGeneratedPath: string): string[] {
  if (!fs.existsSync(registryGeneratedPath)) return [];
  const content = fs.readFileSync(registryGeneratedPath, "utf8");
  const keys: string[] = [];
  const pattern = /"([^"]+)":\s*snapshot_/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    keys.push(match[1]);
  }
  return keys.sort();
}

function listStoreVersions(storeDir: string): string[] {
  if (!fs.existsSync(storeDir)) return [];
  return fs
    .readdirSync(storeDir)
    .filter((file) => file.endsWith(".json") && file !== "manifest.json")
    .map((file) => file.replace(/\.json$/, ""))
    .sort();
}

function readSnapshotFile(
  baseDir: string,
  version: string,
): SelectorRuntimeSnapshot {
  const filePath = path.join(baseDir, `${version}.json`);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as SelectorRuntimeSnapshot;
}

export function writeBundleManifest(
  versions: string[],
  generatedSnapshotsDir = DEFAULT_GENERATED_SNAPSHOTS_DIR,
  manifestPath = DEFAULT_BUNDLE_MANIFEST_PATH,
  options?: {
    pointer?: SelectorSnapshotPointer;
    rollbackVersions?: string[];
  },
): SelectorBundleManifest {
  const schemaHashes: Record<string, string> = {};
  for (const version of versions) {
    const snapshot = readSnapshotFile(generatedSnapshotsDir, version);
    schemaHashes[version] = snapshot.schemaHash ?? computeSchemaHash(snapshot);
  }
  const manifest: SelectorBundleManifest = {
    versions: [...versions].sort(),
    schemaHashes,
    generatedAt: new Date().toISOString(),
  };
  if (options?.pointer) {
    manifest.pointerEpoch = {
      activeVersion: options.pointer.activeVersion,
      previousVersion: options.pointer.previousVersion,
      updatedAt: options.pointer.updatedAt,
    };
  }
  if (options?.rollbackVersions?.length) {
    manifest.rollbackVersions = [...options.rollbackVersions].sort();
  }
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

export function checkBundleRegistryConsistency(
  options: BundleRegistryConsistencyOptions = {},
): BundleRegistryConsistencyResult {
  const storeDir = options.storeDir ?? DEFAULT_SNAPSHOT_STORE_DIR;
  const generatedSnapshotsDir = options.generatedSnapshotsDir ?? DEFAULT_GENERATED_SNAPSHOTS_DIR;
  const registryGeneratedPath =
    options.registryGeneratedPath ?? DEFAULT_SNAPSHOT_REGISTRY_GENERATED_PATH;
  const pointerPath = options.pointerPath ?? DEFAULT_POINTER_PATH;

  const bundledSet = new Set(
    options.bundledVersions ?? listBundleFiles(generatedSnapshotsDir),
  );
  const bundleVersions = [...bundledSet].sort();
  const registryKeys = parseRegistryKeys(registryGeneratedPath);
  const registryKeySet = new Set(registryKeys);

  const missingInBundle: string[] = [];
  const extraInBundle: string[] = [];
  const registryDrift: string[] = [];
  const hashMismatch: string[] = [];
  const pointerIssues: string[] = [];

  for (const version of bundledSet) {
    if (!registryKeySet.has(version)) {
      registryDrift.push(version);
    }
  }

  for (const version of registryKeys) {
    if (!bundledSet.has(version)) {
      registryDrift.push(version);
    }
  }

  const bundleFiles = listBundleFiles(generatedSnapshotsDir);
  const storeSet = new Set(listStoreVersions(storeDir));

  for (const version of bundledSet) {
    if (!storeSet.has(version)) {
      extraInBundle.push(version);
    }
  }

  for (const version of bundleFiles) {
    if (!bundledSet.has(version)) {
      extraInBundle.push(version);
    }
  }

  for (const version of bundledSet) {
    if (!fs.existsSync(path.join(generatedSnapshotsDir, `${version}.json`))) {
      missingInBundle.push(version);
      continue;
    }
    const storeSnapshot = readSnapshotFile(storeDir, version);
    const bundleSnapshot = readSnapshotFile(generatedSnapshotsDir, version);
    const storeComputed = computeSchemaHash(storeSnapshot);
    const bundleComputed = computeSchemaHash(bundleSnapshot);
    const storeDeclared = storeSnapshot.schemaHash;
    const bundleDeclared = bundleSnapshot.schemaHash;
    if (
      storeComputed !== bundleComputed ||
      (storeDeclared !== undefined && storeDeclared !== storeComputed) ||
      (bundleDeclared !== undefined && bundleDeclared !== bundleComputed)
    ) {
      hashMismatch.push(version);
    }
  }

  const pointer = readPointer(pointerPath);
  if (!bundledSet.has(pointer.activeVersion)) {
    pointerIssues.push(`activeVersion ${pointer.activeVersion} not in bundle`);
  }
  if (
    pointer.previousVersion &&
    pointer.previousVersion !== pointer.activeVersion &&
    !bundledSet.has(pointer.previousVersion)
  ) {
    pointerIssues.push(`previousVersion ${pointer.previousVersion} not in bundle`);
  }

  const consistent =
    missingInBundle.length === 0 &&
    extraInBundle.length === 0 &&
    registryDrift.length === 0 &&
    hashMismatch.length === 0 &&
    pointerIssues.length === 0;

  return {
    consistent,
    missingInBundle,
    extraInBundle,
    registryDrift,
    hashMismatch,
    pointerIssues,
  };
}

export function assertBundleRegistryConsistency(
  options?: BundleRegistryConsistencyOptions,
): BundleRegistryConsistencyResult {
  const result = checkBundleRegistryConsistency(options);
  if (!result.consistent) {
    const issues = [
      ...result.missingInBundle.map((v) => `missingInBundle:${v}`),
      ...result.extraInBundle.map((v) => `extraInBundle:${v}`),
      ...result.registryDrift.map((v) => `registryDrift:${v}`),
      ...result.hashMismatch.map((v) => `hashMismatch:${v}`),
      ...result.pointerIssues,
    ];
    throw new Error(`Bundle/registry consistency failed: ${issues.join("; ")}`);
  }
  return result;
}
