/**
 * @advisory v5.5 — runtime fallback trace (loader-safe, no explainability/causal deps).
 */
import { SELECTOR_BASE_SNAPSHOT_V0 } from "@/lib/selector-core/selector-config-snapshot";
import {
  isRuntimeSnapshotStructurallyValid,
} from "@/lib/selector-core/selector-runtime-sanity-guard";
import { computeSchemaHash } from "@/lib/selector-core/selector-snapshot-schema-validator";
import type { SelectorRuntimeSnapshot } from "@/lib/selector-core/types";

export type FallbackSource = "bundle" | "rollbackRegistry" | "store" | "previous" | "v0";

export type FallbackRejectedSource = {
  source: string;
  version: string;
  reasonCode: string;
};

export type FallbackTrace = {
  selectedSource: FallbackSource;
  selectedVersion: string;
  rejectedSources: FallbackRejectedSource[];
  reasonCodes: string[];
  pointerEpoch: number;
  recordedAt: number;
  selectionPath: string[];
};

export type FallbackTraceInput = {
  expectedVersion: string;
  registryKeys: readonly string[];
  registry: Record<string, SelectorRuntimeSnapshot>;
  rollbackRegistry?: Record<string, SelectorRuntimeSnapshot>;
  resolveFromStore?: (version: string) => SelectorRuntimeSnapshot | undefined;
  pointerPrevious?: string;
  pointerEpoch?: number;
  manifestHashes?: Record<string, string>;
  skipPrimaryDueToDrift?: boolean;
};

let lastFallbackTrace: FallbackTrace | null = null;

export function isFallbackExplainabilityEnabled(): boolean {
  if (typeof process === "undefined") return false;
  return (
    process.env.SELECTOR_TELEMETRY_DEBUG === "true" ||
    process.env.NODE_ENV === "development"
  );
}

export function getLastFallbackTrace(): FallbackTrace | null {
  return lastFallbackTrace;
}

export function setLastFallbackTrace(trace: FallbackTrace | null): void {
  lastFallbackTrace = trace;
}

export function __resetFallbackTraceForTests(): void {
  lastFallbackTrace = null;
}

export function recordFallbackTrace(trace: FallbackTrace): FallbackTrace {
  setLastFallbackTrace(trace);
  if (isFallbackExplainabilityEnabled() && typeof console !== "undefined") {
    console.debug("[selector-fallback-trace]", trace);
  }
  return trace;
}

function reject(
  rejected: FallbackRejectedSource[],
  source: string,
  version: string,
  reasonCode: string,
): void {
  rejected.push({ source, version, reasonCode });
}

function isValidSnapshot(
  snapshot: SelectorRuntimeSnapshot | undefined,
): snapshot is SelectorRuntimeSnapshot {
  return !!snapshot && isRuntimeSnapshotStructurallyValid(snapshot);
}

function hashMatchesManifest(
  snapshot: SelectorRuntimeSnapshot,
  version: string,
  manifestHashes?: Record<string, string>,
): boolean {
  if (!manifestHashes?.[version]) return true;
  const actual = snapshot.schemaHash ?? computeSchemaHash(snapshot);
  return actual === manifestHashes[version];
}

export function traceFallbackResolution(input: FallbackTraceInput): FallbackTrace {
  const rejectedSources: FallbackRejectedSource[] = [];
  const reasonCodes: string[] = [];
  const selectionPath: string[] = [];
  const pointerEpoch = input.pointerEpoch ?? 0;

  if (input.skipPrimaryDueToDrift) {
    reasonCodes.push("drift_risk_high_skip_primary");
    reject(rejectedSources, "bundle", input.expectedVersion, "drift_risk_high");
    selectionPath.push(`bundle:${input.expectedVersion}:rejected:drift_risk_high`);
  } else if (input.registryKeys.includes(input.expectedVersion)) {
    const candidate = input.registry[input.expectedVersion];
    if (!isValidSnapshot(candidate)) {
      reject(rejectedSources, "bundle", input.expectedVersion, "structurally_invalid");
      selectionPath.push(`bundle:${input.expectedVersion}:rejected:invalid`);
    } else if (!hashMatchesManifest(candidate, input.expectedVersion, input.manifestHashes)) {
      reject(rejectedSources, "bundle", input.expectedVersion, "hash_mismatch");
      selectionPath.push(`bundle:${input.expectedVersion}:rejected:hash_mismatch`);
    } else {
      return recordFallbackTrace({
        selectedSource: "bundle",
        selectedVersion: input.expectedVersion,
        rejectedSources,
        reasonCodes,
        pointerEpoch,
        recordedAt: Date.now(),
        selectionPath: [...selectionPath, `selected:bundle:${input.expectedVersion}`],
      });
    }
  } else {
    reject(rejectedSources, "bundle", input.expectedVersion, "not_in_registry");
    selectionPath.push(`bundle:${input.expectedVersion}:rejected:not_found`);
  }

  if (input.rollbackRegistry?.[input.expectedVersion]) {
    const candidate = input.rollbackRegistry[input.expectedVersion];
    if (
      isValidSnapshot(candidate) &&
      hashMatchesManifest(candidate, input.expectedVersion, input.manifestHashes)
    ) {
      reasonCodes.push("bundle_miss_using_rollback_registry");
      return recordFallbackTrace({
        selectedSource: "rollbackRegistry",
        selectedVersion: input.expectedVersion,
        rejectedSources,
        reasonCodes,
        pointerEpoch,
        recordedAt: Date.now(),
        selectionPath: [...selectionPath, `selected:rollbackRegistry:${input.expectedVersion}`],
      });
    }
    reject(rejectedSources, "rollbackRegistry", input.expectedVersion, "invalid_or_hash_mismatch");
    selectionPath.push(`rollbackRegistry:${input.expectedVersion}:rejected`);
  } else {
    reject(rejectedSources, "rollbackRegistry", input.expectedVersion, "not_in_registry");
    selectionPath.push(`rollbackRegistry:${input.expectedVersion}:rejected:not_found`);
  }

  const fromStore = input.resolveFromStore?.(input.expectedVersion);
  if (isValidSnapshot(fromStore)) {
    reasonCodes.push("rollback_miss_using_store");
    return recordFallbackTrace({
      selectedSource: "store",
      selectedVersion: input.expectedVersion,
      rejectedSources,
      reasonCodes,
      pointerEpoch,
      recordedAt: Date.now(),
      selectionPath: [...selectionPath, `selected:store:${input.expectedVersion}`],
    });
  }
  reject(rejectedSources, "store", input.expectedVersion, "not_available");
  selectionPath.push(`store:${input.expectedVersion}:rejected:not_available`);

  if (input.pointerPrevious) {
    const fromPrevious =
      input.registry[input.pointerPrevious] ??
      input.rollbackRegistry?.[input.pointerPrevious] ??
      input.resolveFromStore?.(input.pointerPrevious);
    if (isValidSnapshot(fromPrevious)) {
      reasonCodes.push("using_pointer_previous");
      return recordFallbackTrace({
        selectedSource: "previous",
        selectedVersion: fromPrevious.version,
        rejectedSources,
        reasonCodes,
        pointerEpoch,
        recordedAt: Date.now(),
        selectionPath: [...selectionPath, `selected:previous:${fromPrevious.version}`],
      });
    }
    reject(rejectedSources, "previous", input.pointerPrevious, "invalid_or_missing");
    selectionPath.push(`previous:${input.pointerPrevious}:rejected`);
  }

  reasonCodes.push("fallback_to_v0");
  return recordFallbackTrace({
    selectedSource: "v0",
    selectedVersion: SELECTOR_BASE_SNAPSHOT_V0.version,
    rejectedSources,
    reasonCodes,
    pointerEpoch,
    recordedAt: Date.now(),
    selectionPath: [...selectionPath, `selected:v0:${SELECTOR_BASE_SNAPSHOT_V0.version}`],
  });
}
