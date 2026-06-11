/**
 * @advisory v5.3.3 — read-only unified view of bundle + rollback registries.
 */
import { computeSchemaHash } from "@/lib/selector-core/selector-snapshot-schema-validator";
import type { SelectorRuntimeSnapshot } from "@/lib/selector-core/types";

export type SnapshotAvailabilityEntry = {
  version: string;
  inBundle: boolean;
  inRollbackRegistry: boolean;
  schemaHash?: string;
  sources: string[];
};

export type SnapshotAvailabilityInput = {
  registry: Record<string, SelectorRuntimeSnapshot>;
  rollbackRegistry: Record<string, SelectorRuntimeSnapshot>;
  manifest?: {
    versions?: string[];
    schemaHashes?: Record<string, string>;
    rollbackVersions?: string[];
  };
};

export function getSnapshotAvailabilityMap(
  input: SnapshotAvailabilityInput,
): Record<string, SnapshotAvailabilityEntry> {
  const map: Record<string, SnapshotAvailabilityEntry> = {};
  const versions = new Set<string>([
    ...Object.keys(input.registry),
    ...Object.keys(input.rollbackRegistry),
    ...(input.manifest?.versions ?? []),
    ...(input.manifest?.rollbackVersions ?? []),
  ]);

  for (const version of versions) {
    const inBundle = version in input.registry;
    const inRollbackRegistry = version in input.rollbackRegistry;
    const snapshot = input.registry[version] ?? input.rollbackRegistry[version];
    const sources: string[] = [];
    if (inBundle) sources.push("bundle");
    if (inRollbackRegistry) sources.push("rollbackRegistry");
    map[version] = {
      version,
      inBundle,
      inRollbackRegistry,
      schemaHash:
        input.manifest?.schemaHashes?.[version] ??
        snapshot?.schemaHash ??
        (snapshot ? computeSchemaHash(snapshot) : undefined),
      sources,
    };
  }

  return map;
}

export function isVersionAvailable(
  version: string,
  availabilityMap: Record<string, SnapshotAvailabilityEntry>,
): boolean {
  return version in availabilityMap;
}
