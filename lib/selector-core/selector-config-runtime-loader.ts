/**
 * @advisory v5.3.3 — runtime snapshot loader with pre-guard, drift prevention, explainability.
 * @advisory v5.3.4 — runtime context snapshot + determinism gate.
 */
import crypto from "node:crypto";
import {
  SELECTOR_BASE_SNAPSHOT_V0,
} from "@/lib/selector-core/selector-config-snapshot";
import {
  traceFallbackResolution,
  type FallbackSource,
} from "@/lib/selector-core/selector-fallback-trace";
import {
  buildPointerFingerprint,
  detectPointerDrift,
} from "@/lib/selector-core/selector-distributed-pointer-guard";
import {
  assertPreResolutionConsistency,
  validateDeterminism,
} from "@/lib/selector-core/selector-determinism-gate";
import {
  captureRuntimeContextSnapshot,
  computeRegistryHash,
  getLastRuntimeContextSnapshot,
  __resetRuntimeContextSnapshotForTests,
} from "@/lib/selector-core/selector-runtime-context-snapshot";
import {
  detectRuntimeBundleDrift,
  predictDriftRisk,
} from "@/lib/selector-core/selector-runtime-sanity-guard";
import { revalidateRuntimeSnapshot } from "@/lib/selector-core/selector-runtime-snapshot-revalidator";
import { resolveEffectiveVersion } from "@/lib/selector-core/selector-runtime-version-resolver";
import { computeSchemaHash } from "@/lib/selector-core/selector-snapshot-schema-validator";
import { getSnapshotAvailabilityMap } from "@/lib/selector-core/selector-unified-snapshot-index";
import type {
  SelectorEngineConfigShape,
  SelectorRuntimeSnapshot,
} from "@/lib/selector-core/types";
import activePointerJson from "@/lib/selector-core/generated/selector-active-pointer.json";
import bundleManifestJson from "@/lib/selector-core/generated/selector-bundle-manifest.json";
import { SNAPSHOT_REGISTRY } from "@/lib/selector-core/generated/selector-snapshot-registry.generated";
import { ROLLBACK_SNAPSHOT_REGISTRY } from "@/lib/selector-core/generated/selector-rollback-registry.generated";

function readEnvFlag(name: string): boolean {
  return typeof process !== "undefined" && process.env[name] === "true";
}

function readSampleRate(): number {
  if (typeof process === "undefined") return 0;
  const raw = process.env.SELECTOR_DECISION_TRACE_SAMPLE ?? "0";
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(1, Math.max(0, parsed));
}

type CachedLoaderState = {
  snapshot: SelectorRuntimeSnapshot;
  pointerEpoch: number;
};

let cachedLoaderState: CachedLoaderState | null = null;
let lastDriftDetectedAtSelection = false;
let lastDeterminismExplanation: string[] = [];

export function wasDriftDetectedAtSelection(): boolean {
  return lastDriftDetectedAtSelection;
}

export function getLastDeterminismExplanation(): readonly string[] {
  return lastDeterminismExplanation;
}

function buildLoaderContextHash(expectedVersion: string, pointerEpoch: number): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ expectedVersion, pointerEpoch }))
    .digest("hex");
}

function readPointerEpoch(): number {
  const pointer = activePointerJson as { updatedAt?: number };
  const manifest = bundleManifestJson as {
    pointerEpoch?: { updatedAt?: number };
  };
  return manifest.pointerEpoch?.updatedAt ?? pointer.updatedAt ?? 0;
}

function isCacheStale(): boolean {
  if (!cachedLoaderState) return true;
  return cachedLoaderState.pointerEpoch !== readPointerEpoch();
}

function resolveSnapshotFromSource(
  source: FallbackSource,
  version: string,
  registry: Record<string, SelectorRuntimeSnapshot>,
  rollbackRegistry: Record<string, SelectorRuntimeSnapshot>,
): SelectorRuntimeSnapshot {
  switch (source) {
    case "bundle":
      return registry[version] ?? SELECTOR_BASE_SNAPSHOT_V0;
    case "rollbackRegistry":
      return rollbackRegistry[version] ?? registry[version] ?? SELECTOR_BASE_SNAPSHOT_V0;
    case "previous":
    case "store":
      return rollbackRegistry[version] ?? registry[version] ?? SELECTOR_BASE_SNAPSHOT_V0;
    case "v0":
    default:
      return registry[SELECTOR_BASE_SNAPSHOT_V0.version] ?? SELECTOR_BASE_SNAPSHOT_V0;
  }
}

function resolveSnapshotOnce(): SelectorRuntimeSnapshot {
  const pointer = activePointerJson as {
    activeVersion: string;
    previousVersion: string;
    updatedAt: number;
  };
  const manifest = bundleManifestJson as {
    schemaHashes?: Record<string, string>;
    versions?: string[];
    pointerEpoch?: { updatedAt: number; activeVersion: string; previousVersion: string };
    generatedAt?: string;
  };

  const registry = SNAPSHOT_REGISTRY as Record<string, SelectorRuntimeSnapshot>;
  const rollbackRegistry = ROLLBACK_SNAPSHOT_REGISTRY as Record<string, SelectorRuntimeSnapshot>;
  const registryKeys = Object.keys(registry);
  const availabilityMap = getSnapshotAvailabilityMap({
    registry,
    rollbackRegistry,
    manifest,
  });

  const version = resolveEffectiveVersion(pointer);
  const pointerEpoch = readPointerEpoch();

  const preResolution = assertPreResolutionConsistency({
    pointer: { ...pointer, status: "stable" },
    manifestPointerEpoch: manifest.pointerEpoch,
    expectedVersion: version,
    availabilityMap,
    cachedPointerEpoch: cachedLoaderState?.pointerEpoch,
  });
  lastDriftDetectedAtSelection = preResolution.driftDetectedAtSelection;

  if (preResolution.reconcileRequired) {
    cachedLoaderState = null;
  }

  const liveRegistryHash = computeRegistryHash(registry, rollbackRegistry, manifest.schemaHashes);
  const loaderContextHash = buildLoaderContextHash(version, pointerEpoch);
  const determinism = validateDeterminism({
    runtimeContext: getLastRuntimeContextSnapshot() ?? undefined,
    livePointerEpoch: pointerEpoch,
    liveRegistryHash,
    liveContextHash: loaderContextHash,
    preResolution,
  });
  lastDeterminismExplanation = determinism.explanation;
  const skipDueToDeterminism = !determinism.isValid;

  if (skipDueToDeterminism) {
    lastDriftDetectedAtSelection = true;
    cachedLoaderState = null;
  }

  const primaryCandidate =
    registry[version] ??
    rollbackRegistry[version] ??
    registry[SELECTOR_BASE_SNAPSHOT_V0.version];
  const driftRisk = predictDriftRisk({
    pointerEpoch: pointer.updatedAt,
    manifestPointerEpoch: manifest.pointerEpoch?.updatedAt,
    registryHashForVersion:
      primaryCandidate?.schemaHash ?? computeSchemaHash(primaryCandidate ?? SELECTOR_BASE_SNAPSHOT_V0),
    manifestHashForVersion: manifest.schemaHashes?.[version],
    registryKeyCount: registryKeys.length,
    manifestVersionCount: manifest.versions?.length,
  });

  const fallbackTrace = traceFallbackResolution({
    expectedVersion: version,
    registryKeys,
    registry,
    rollbackRegistry,
    pointerPrevious: pointer.previousVersion,
    pointerEpoch,
    manifestHashes: manifest.schemaHashes,
    skipPrimaryDueToDrift:
      driftRisk.riskLevel === "high" ||
      preResolution.useFallbackChain ||
      skipDueToDeterminism,
  });

  const snapshot = resolveSnapshotFromSource(
    fallbackTrace.selectedSource,
    fallbackTrace.selectedVersion,
    registry,
    rollbackRegistry,
  );

  const drift = detectRuntimeBundleDrift(snapshot, fallbackTrace.selectedVersion, manifest.schemaHashes, {
    registryKeyCount: registryKeys.length,
    manifestVersionCount: manifest.versions?.length,
  });
  if (drift.driftDetected) {
    lastDriftDetectedAtSelection = true;
  }

  const result = revalidateRuntimeSnapshot({
    snapshot,
    expectedVersion: version,
    registryKeys,
    registry,
    rollbackRegistry,
    fallbackSnapshot:
      registry[pointer.previousVersion] ?? rollbackRegistry[pointer.previousVersion],
    pointerPrevious: pointer.previousVersion,
  });

  if (drift.driftDetected && !result.usedFallback) {
    return (
      registry[pointer.previousVersion] ??
      rollbackRegistry[pointer.previousVersion] ??
      registry[SELECTOR_BASE_SNAPSHOT_V0.version] ??
      SELECTOR_BASE_SNAPSHOT_V0
    );
  }

  captureRuntimeContextSnapshot({
    contextHash: loaderContextHash,
    pointerEpoch,
    registry,
    rollbackRegistry,
    manifestSchemaHashes: manifest.schemaHashes,
  });

  return result.snapshot;
}

export function loadLatestSelectorSnapshot(): SelectorRuntimeSnapshot {
  if (cachedLoaderState && !isCacheStale()) {
    return cachedLoaderState.snapshot;
  }

  const pointer = activePointerJson as {
    activeVersion: string;
    previousVersion: string;
    updatedAt: number;
  };
  const manifest = bundleManifestJson as {
    pointerEpoch?: { updatedAt: number; activeVersion: string; previousVersion: string };
    generatedAt?: string;
  };

  if (cachedLoaderState && manifest.pointerEpoch) {
    const drift = detectPointerDrift(
      buildPointerFingerprint(
        {
          activeVersion: pointer.activeVersion,
          previousVersion: pointer.previousVersion,
          status: "stable",
          updatedAt: cachedLoaderState.pointerEpoch,
        },
        manifest.generatedAt,
      ),
      buildPointerFingerprint(
        {
          activeVersion: manifest.pointerEpoch.activeVersion,
          previousVersion: manifest.pointerEpoch.previousVersion,
          status: "stable",
          updatedAt: manifest.pointerEpoch.updatedAt,
        },
        manifest.generatedAt,
      ),
    );
    if (drift.driftDetected) {
      cachedLoaderState = null;
    }
  }

  const finalSnapshot = resolveSnapshotOnce();

  cachedLoaderState = {
    snapshot: finalSnapshot,
    pointerEpoch: readPointerEpoch(),
  };
  return finalSnapshot;
}

export type ResolvedSelectorEngineConfig = SelectorEngineConfigShape & {
  get featureFlags(): {
    securityGradual: boolean;
    dashboardFiltersSheet: boolean;
    sheetSearchableGlobal: boolean;
    legacySearchableKeys: readonly string[];
  };
  get observability(): {
    traceEnabled: boolean;
    traceSampleRate: number;
    telemetryDebug: boolean;
  };
};

let cachedEngineConfig: ResolvedSelectorEngineConfig | null = null;

export function resolveSelectorEngineConfig(): ResolvedSelectorEngineConfig {
  if (cachedEngineConfig && cachedLoaderState && !isCacheStale()) {
    return cachedEngineConfig;
  }

  const snap = loadLatestSelectorSnapshot();
  const staticConfig = snap.config;

  cachedEngineConfig = {
    rolloutByDomain: staticConfig.rolloutByDomain,
    thresholds: staticConfig.thresholds,
    defaultBehavior: staticConfig.defaultBehavior,
    get featureFlags() {
      return {
        securityGradual: readEnvFlag("SELECTOR_SECURITY_GRADUAL"),
        dashboardFiltersSheet: readEnvFlag("SELECTOR_DASHBOARD_FILTERS_SHEET"),
        sheetSearchableGlobal: readEnvFlag("SELECTOR_SHEET_SEARCHABLE"),
        legacySearchableKeys: [] as readonly string[],
      };
    },
    get observability() {
      return {
        traceEnabled: readEnvFlag("SELECTOR_DECISION_TRACE"),
        traceSampleRate: readSampleRate(),
        telemetryDebug: readEnvFlag("SELECTOR_TELEMETRY_DEBUG"),
      };
    },
  };

  return cachedEngineConfig;
}

/** Test helper — reset module-level caches. */
export function __resetSelectorRuntimeLoaderForTests(): void {
  cachedLoaderState = null;
  cachedEngineConfig = null;
  lastDriftDetectedAtSelection = false;
  lastDeterminismExplanation = [];
  __resetRuntimeContextSnapshotForTests();
}

export { resolveEffectiveVersion } from "@/lib/selector-core/selector-runtime-version-resolver";
export { revalidateRuntimeSnapshot } from "@/lib/selector-core/selector-runtime-snapshot-revalidator";
export { getLastFallbackTrace } from "@/lib/selector-core/selector-fallback-trace";
export {
  getLastRuntimeContextSnapshot,
} from "@/lib/selector-core/selector-runtime-context-snapshot";
