/**
 * @advisory v5.3.2 — runtime snapshot revalidation with rollback registry + store adapter.
 */
import { SELECTOR_BASE_SNAPSHOT_V0 } from "@/lib/selector-core/selector-config-snapshot";
import {
  isRuntimeSnapshotStructurallyValid,
  type RuntimeSanityResult,
} from "@/lib/selector-core/selector-runtime-sanity-guard";
import { computeSchemaHash } from "@/lib/selector-core/selector-snapshot-schema-validator";
import type { SelectorRuntimeSnapshot } from "@/lib/selector-core/types";

export type RuntimeRevalidationInput = {
  snapshot: SelectorRuntimeSnapshot;
  expectedVersion: string;
  registryKeys: readonly string[];
  registry: Record<string, SelectorRuntimeSnapshot>;
  rollbackRegistry?: Record<string, SelectorRuntimeSnapshot>;
  resolveFromStore?: (version: string) => SelectorRuntimeSnapshot | undefined;
  fallbackSnapshot?: SelectorRuntimeSnapshot;
  pointerPrevious?: string;
};

export type RuntimeRevalidationResult = RuntimeSanityResult;

function registryHas(keys: readonly string[], version: string | undefined): boolean {
  if (!version?.trim()) return false;
  return keys.includes(version);
}

function resolveSnapshotForVersion(
  version: string,
  registry: Record<string, SelectorRuntimeSnapshot>,
  registryKeys: readonly string[],
  rollbackRegistry?: Record<string, SelectorRuntimeSnapshot>,
  resolveFromStore?: (version: string) => SelectorRuntimeSnapshot | undefined,
): SelectorRuntimeSnapshot | undefined {
  if (registryHas(registryKeys, version)) return registry[version];
  if (rollbackRegistry?.[version]) return rollbackRegistry[version];
  return resolveFromStore?.(version);
}

function pickFallback(
  registry: Record<string, SelectorRuntimeSnapshot>,
  registryKeys: readonly string[],
  rollbackRegistry: Record<string, SelectorRuntimeSnapshot> | undefined,
  resolveFromStore: ((version: string) => SelectorRuntimeSnapshot | undefined) | undefined,
  pointerPrevious?: string,
): SelectorRuntimeSnapshot | undefined {
  if (pointerPrevious) {
    const fromPrevious = resolveSnapshotForVersion(
      pointerPrevious,
      registry,
      registryKeys,
      rollbackRegistry,
      resolveFromStore,
    );
    if (fromPrevious && isRuntimeSnapshotStructurallyValid(fromPrevious)) {
      return fromPrevious;
    }
  }
  if (registryHas(registryKeys, SELECTOR_BASE_SNAPSHOT_V0.version)) {
    return registry[SELECTOR_BASE_SNAPSHOT_V0.version];
  }
  if (rollbackRegistry?.[SELECTOR_BASE_SNAPSHOT_V0.version]) {
    return rollbackRegistry[SELECTOR_BASE_SNAPSHOT_V0.version];
  }
  return undefined;
}

function validateResolvedSnapshot(
  snapshot: SelectorRuntimeSnapshot,
  expectedVersion: string,
  resolvedFallback: SelectorRuntimeSnapshot,
  warnings: string[],
): RuntimeRevalidationResult {
  if (!isRuntimeSnapshotStructurallyValid(snapshot)) {
    if (isRuntimeSnapshotStructurallyValid(resolvedFallback)) {
      return {
        snapshot: resolvedFallback,
        usedFallback: true,
        fallbackVersion: resolvedFallback.version,
        warnings: [...warnings, `corrupt snapshot ${expectedVersion}; fell back to ${resolvedFallback.version}`],
      };
    }
    return {
      snapshot: SELECTOR_BASE_SNAPSHOT_V0,
      usedFallback: true,
      fallbackVersion: SELECTOR_BASE_SNAPSHOT_V0.version,
      warnings: [...warnings, `corrupt snapshot ${expectedVersion}; fell back to v0`],
    };
  }

  if (snapshot.schemaHash) {
    const computed = computeSchemaHash(snapshot);
    if (computed !== snapshot.schemaHash) {
      warnings.push(`schemaHash mismatch for ${expectedVersion}`);
      if (isRuntimeSnapshotStructurallyValid(resolvedFallback)) {
        return {
          snapshot: resolvedFallback,
          usedFallback: true,
          fallbackVersion: resolvedFallback.version,
          warnings,
        };
      }
    }
  }

  return { snapshot, usedFallback: false, warnings };
}

export function revalidateRuntimeSnapshot(
  input: RuntimeRevalidationInput,
): RuntimeRevalidationResult {
  const warnings: string[] = [];
  const {
    snapshot,
    expectedVersion,
    registryKeys,
    registry,
    rollbackRegistry,
    resolveFromStore,
    fallbackSnapshot,
    pointerPrevious,
  } = input;

  const resolvedFallback =
    fallbackSnapshot ??
    pickFallback(registry, registryKeys, rollbackRegistry, resolveFromStore, pointerPrevious) ??
    SELECTOR_BASE_SNAPSHOT_V0;

  const resolved =
    snapshot.version === expectedVersion
      ? snapshot
      : resolveSnapshotForVersion(
          expectedVersion,
          registry,
          registryKeys,
          rollbackRegistry,
          resolveFromStore,
        );

  if (!resolved) {
    warnings.push(`version ${expectedVersion} not in bundled or rollback registry`);
    if (isRuntimeSnapshotStructurallyValid(resolvedFallback)) {
      return {
        snapshot: resolvedFallback,
        usedFallback: true,
        fallbackVersion: resolvedFallback.version,
        warnings,
      };
    }
    return {
      snapshot: SELECTOR_BASE_SNAPSHOT_V0,
      usedFallback: true,
      fallbackVersion: SELECTOR_BASE_SNAPSHOT_V0.version,
      warnings,
    };
  }

  if (resolved.version !== expectedVersion) {
    warnings.push(`snapshot.version ${resolved.version} !== expected ${expectedVersion}`);
  }

  return validateResolvedSnapshot(resolved, expectedVersion, resolvedFallback, warnings);
}
