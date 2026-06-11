/**
 * @advisory v5.3 — lightweight runtime sanity guard with fallback.
 * @advisory v5.3.2 — bundle drift detection + self-healing fallback trigger.
 */
import { SELECTOR_BASE_SNAPSHOT_V0 } from "@/lib/selector-core/selector-config-snapshot";
import { revalidateRuntimeSnapshot } from "@/lib/selector-core/selector-runtime-snapshot-revalidator";
import { resolveEffectiveVersion } from "@/lib/selector-core/selector-runtime-version-resolver";
import { computeSchemaHash } from "@/lib/selector-core/selector-snapshot-schema-validator";
import type { SelectorRuntimeSnapshot } from "@/lib/selector-core/types";

export type RuntimeSanityResult = {
  snapshot: SelectorRuntimeSnapshot;
  usedFallback: boolean;
  fallbackVersion?: string;
  warnings: string[];
};

export type RuntimeDriftResult = {
  driftDetected: boolean;
  hashMismatch: boolean;
  registryCountMismatch: boolean;
  warnings: string[];
};

export type DriftRiskLevel = "none" | "low" | "high";

export type DriftRiskResult = {
  riskLevel: DriftRiskLevel;
  reasons: string[];
};

export function predictDriftRisk(input: {
  pointerEpoch: number;
  manifestPointerEpoch?: number;
  registryHashForVersion?: string;
  manifestHashForVersion?: string;
  registryKeyCount?: number;
  manifestVersionCount?: number;
}): DriftRiskResult {
  const reasons: string[] = [];

  if (
    typeof input.manifestPointerEpoch === "number" &&
    input.pointerEpoch !== input.manifestPointerEpoch
  ) {
    reasons.push(
      `pointerEpoch mismatch: ${input.pointerEpoch} vs ${input.manifestPointerEpoch}`,
    );
    return { riskLevel: "high", reasons };
  }

  if (
    input.registryHashForVersion &&
    input.manifestHashForVersion &&
    input.registryHashForVersion !== input.manifestHashForVersion
  ) {
    reasons.push("registry/manifest hash mismatch for expected version");
    return { riskLevel: "high", reasons };
  }

  if (
    typeof input.registryKeyCount === "number" &&
    typeof input.manifestVersionCount === "number" &&
    input.registryKeyCount !== input.manifestVersionCount
  ) {
    reasons.push(
      `registry/manifest count mismatch: ${input.registryKeyCount} vs ${input.manifestVersionCount}`,
    );
    return { riskLevel: "low", reasons };
  }

  return { riskLevel: "none", reasons };
}

export function isRuntimeSnapshotStructurallyValid(snapshot: SelectorRuntimeSnapshot): boolean {
  if (!snapshot?.version || !snapshot?.config || !snapshot?.provenance) return false;
  const minOpts = snapshot.config.thresholds?.sheetMinOptions;
  if (typeof minOpts !== "number" || !Number.isFinite(minOpts) || minOpts < 1) return false;
  if (snapshot.config.defaultBehavior?.fallbackSurface !== "dropdown") return false;
  if (!snapshot.config.rolloutByDomain || typeof snapshot.config.rolloutByDomain !== "object") {
    return false;
  }
  return true;
}

export function detectRuntimeBundleDrift(
  snapshot: SelectorRuntimeSnapshot,
  version: string,
  manifestHashes: Record<string, string> | undefined,
  options?: { registryKeyCount?: number; manifestVersionCount?: number },
): RuntimeDriftResult {
  const warnings: string[] = [];
  let hashMismatch = false;
  let registryCountMismatch = false;

  if (manifestHashes) {
    const expectedHash = manifestHashes[version];
    const actualHash = snapshot.schemaHash ?? computeSchemaHash(snapshot);
    if (expectedHash && expectedHash !== actualHash) {
      hashMismatch = true;
      warnings.push(`runtime hash drift for ${version}`);
    }
  }

  if (
    typeof options?.registryKeyCount === "number" &&
    typeof options?.manifestVersionCount === "number" &&
    options.registryKeyCount !== options.manifestVersionCount
  ) {
    registryCountMismatch = true;
    warnings.push(
      `registry/manifest version count drift: ${options.registryKeyCount} vs ${options.manifestVersionCount}`,
    );
  }

  return {
    driftDetected: hashMismatch || registryCountMismatch,
    hashMismatch,
    registryCountMismatch,
    warnings,
  };
}

export function validateAtRuntime(
  snapshot: SelectorRuntimeSnapshot,
  expectedVersion: string,
  fallbackSnapshot?: SelectorRuntimeSnapshot,
  options?: {
    registryKeys?: readonly string[];
    registry?: Record<string, SelectorRuntimeSnapshot>;
    rollbackRegistry?: Record<string, SelectorRuntimeSnapshot>;
    resolveFromStore?: (version: string) => SelectorRuntimeSnapshot | undefined;
    pointerPrevious?: string;
    manifestHashes?: Record<string, string>;
    manifestVersionCount?: number;
  },
): RuntimeSanityResult {
  const registryKeys = options?.registryKeys ?? [expectedVersion, SELECTOR_BASE_SNAPSHOT_V0.version];
  const registry =
    options?.registry ??
    Object.fromEntries(
      registryKeys.map((key) => [
        key,
        key === expectedVersion ? snapshot : (fallbackSnapshot ?? SELECTOR_BASE_SNAPSHOT_V0),
      ]),
    );

  const drift = detectRuntimeBundleDrift(snapshot, expectedVersion, options?.manifestHashes, {
    registryKeyCount: registryKeys.length,
    manifestVersionCount: options?.manifestVersionCount,
  });

  const result = revalidateRuntimeSnapshot({
    snapshot,
    expectedVersion,
    registryKeys,
    registry,
    rollbackRegistry: options?.rollbackRegistry,
    resolveFromStore: options?.resolveFromStore,
    fallbackSnapshot,
    pointerPrevious: options?.pointerPrevious,
  });

  if (drift.driftDetected && !result.usedFallback) {
    const previous = options?.pointerPrevious;
    const previousSnapshot =
      (previous && options?.rollbackRegistry?.[previous]) ||
      (previous && options?.registry?.[previous]);
    if (previousSnapshot && isRuntimeSnapshotStructurallyValid(previousSnapshot)) {
      return {
        snapshot: previousSnapshot,
        usedFallback: true,
        fallbackVersion: previousSnapshot.version,
        warnings: [...drift.warnings, ...result.warnings, "runtime self-healing triggered by bundle drift"],
      };
    }
  }

  return {
    ...result,
    warnings: [...drift.warnings, ...result.warnings],
  };
}

/** @deprecated v5.3.1 — use resolveEffectiveVersion from selector-runtime-version-resolver */
export function resolveActiveVersion(
  pointer: { activeVersion: string },
): string {
  return resolveEffectiveVersion(pointer);
}
