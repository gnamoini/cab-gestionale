/**
 * @advisory v5.3 — snapshot consistency validation. No engine file mutation.
 */
import fs from "node:fs";
import path from "node:path";
import {
  buildSelectorRuntimeSnapshotDeterministic,
  diffRuntimeSnapshots,
  runtimeSnapshotsEqual,
} from "@/lib/selector-core/selector-config-snapshot";
import {
  getActiveRegistryState,
  loadPromotionRegistry,
} from "@/lib/selector-core/selector-config-promotion-registry";
import { readPointer } from "@/lib/selector-core/selector-snapshot-atomic-switch";
import {
  DEFAULT_GENERATED_SNAPSHOTS_DIR,
} from "@/lib/selector-core/selector-snapshot-bundle-sync";
import type {
  PromotionRegistryState,
  SelectorConfigMergeSlice,
  SelectorRuntimeSnapshot,
  SnapshotConsistencyResult,
} from "@/lib/selector-core/types";

function readActiveBundledSnapshot(): SelectorRuntimeSnapshot | null {
  const pointer = readPointer();
  const filePath = path.join(DEFAULT_GENERATED_SNAPSHOTS_DIR, `${pointer.activeVersion}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as SelectorRuntimeSnapshot;
}

/** @deprecated v5.2 — use snapshot registry */
export function buildEffectiveSelectorConfig(registry?: PromotionRegistryState) {
  const state = registry ?? getActiveRegistryState();
  const snapshot = buildSelectorRuntimeSnapshotDeterministic(state);
  return {
    snapshot: {
      rolloutByDomain: snapshot.config.rolloutByDomain,
      sheetMinOptions: snapshot.config.thresholds.sheetMinOptions,
    },
    mergeVersion: state.version,
    appliedProposalIds: snapshot.provenance.appliedProposals,
  };
}

export function validateSnapshotConsistency(
  registry?: PromotionRegistryState,
): SnapshotConsistencyResult {
  const state = registry ?? getActiveRegistryState();
  const expected = buildSelectorRuntimeSnapshotDeterministic(state);
  const actual = readActiveBundledSnapshot() ?? expected;

  const configDiff: string[] = [];
  if (expected.config.thresholds.sheetMinOptions !== actual.config.thresholds.sheetMinOptions) {
    configDiff.push(
      `sheetMinOptions: ${expected.config.thresholds.sheetMinOptions} vs ${actual.config.thresholds.sheetMinOptions}`,
    );
  }
  const domains = new Set([
    ...Object.keys(expected.config.rolloutByDomain),
    ...Object.keys(actual.config.rolloutByDomain),
  ]);
  for (const domain of [...domains].sort()) {
    const ev = expected.config.rolloutByDomain[domain];
    const av = actual.config.rolloutByDomain[domain];
    if (ev !== av) configDiff.push(`rolloutByDomain.${domain}: ${ev} vs ${av}`);
  }

  const provenanceDiff: string[] = [];
  if (JSON.stringify(expected.provenance) !== JSON.stringify(actual.provenance)) {
    provenanceDiff.push("provenance mismatch (config may still match — run selector:config:sync to publish)");
  }

  return {
    consistent: configDiff.length === 0,
    expected,
    actual,
    diff: [...configDiff, ...provenanceDiff],
  };
}

/** @deprecated v5.2 — use validateSnapshotConsistency */
export function validateRegistryConsistency(registry?: PromotionRegistryState) {
  const result = validateSnapshotConsistency(registry);
  return {
    consistent: result.consistent,
    expected: {
      rolloutByDomain: result.expected.config.rolloutByDomain,
      sheetMinOptions: result.expected.config.thresholds.sheetMinOptions,
    },
    actual: {
      rolloutByDomain: result.actual.config.rolloutByDomain,
      sheetMinOptions: result.actual.config.thresholds.sheetMinOptions,
    },
    diff: result.diff,
  };
}

export function checkSnapshotConsistency(
  registryPath?: string,
): SnapshotConsistencyResult {
  if (registryPath) loadPromotionRegistry(registryPath);
  return validateSnapshotConsistency(undefined);
}

/** @deprecated v5.2 */
export function applyEffectiveConfigToEngineFile(): never {
  throw new Error("applyEffectiveConfigToEngineFile removed in v5.2 — use buildAndPublishSnapshot");
}

/** @deprecated v5.3 */
export function parseEngineConfigSnapshot(): never {
  throw new Error("parseEngineConfigSnapshot removed — use readActiveBundledSnapshot via pointer");
}

/** @deprecated v5.2 */
export function syncEffectiveConfigFromRegistry(registryPath?: string): SnapshotConsistencyResult {
  if (registryPath) loadPromotionRegistry(registryPath);
  return validateSnapshotConsistency();
}

/** @deprecated v5.2 */
export function checkEffectiveConfigConsistency(registryPath?: string) {
  if (registryPath) loadPromotionRegistry(registryPath);
  return validateRegistryConsistency();
}

export function assertSnapshotsMatch(
  expected: SelectorConfigMergeSlice,
  actual: SelectorConfigMergeSlice,
): void {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(`Snapshot slice mismatch: ${JSON.stringify(expected)} vs ${JSON.stringify(actual)}`);
  }
}

export function assertRuntimeSnapshotsMatch(
  expected: SelectorRuntimeSnapshot,
  actual: SelectorRuntimeSnapshot,
): void {
  if (!runtimeSnapshotsEqual(expected, actual)) {
    throw new Error(`Runtime snapshot mismatch: ${diffRuntimeSnapshots(expected, actual).join("; ")}`);
  }
}
