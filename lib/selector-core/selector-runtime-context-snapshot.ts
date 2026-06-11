/**
 * @advisory v5.3.4 — immutable runtime context capture for deterministic replay.
 */
import crypto from "node:crypto";
import { computeSchemaHash } from "@/lib/selector-core/selector-snapshot-schema-validator";
import type { SelectorRuntimeSnapshot } from "@/lib/selector-core/types";

export type SelectorRuntimeContext = {
  readonly timestamp: number;
  readonly pointerEpoch: number;
  readonly registryHash: string;
  readonly contextHash: string;
  readonly envFingerprint: string;
};

export const ALLOWED_ENV_KEYS = [
  "SELECTOR_DECISION_TRACE",
  "SELECTOR_TELEMETRY_DEBUG",
  "SELECTOR_SECURITY_GRADUAL",
  "SELECTOR_SHEET_SEARCHABLE",
  "SELECTOR_DASHBOARD_FILTERS_SHEET",
  "NODE_ENV",
] as const;

let lastRuntimeContextSnapshot: SelectorRuntimeContext | null = null;

export function computeRegistryHash(
  registry: Record<string, SelectorRuntimeSnapshot>,
  rollbackRegistry: Record<string, SelectorRuntimeSnapshot>,
  manifestSchemaHashes?: Record<string, string>,
): string {
  const entries: Array<[string, string]> = [];
  const versions = new Set([
    ...Object.keys(registry),
    ...Object.keys(rollbackRegistry),
  ]);

  for (const version of [...versions].sort()) {
    const snapshot = registry[version] ?? rollbackRegistry[version];
    const hash =
      manifestSchemaHashes?.[version] ??
      snapshot?.schemaHash ??
      (snapshot ? computeSchemaHash(snapshot) : "missing");
    const source = version in registry ? "bundle" : "rollback";
    entries.push([version, `${source}:${hash}`]);
  }

  return crypto.createHash("sha256").update(JSON.stringify(entries)).digest("hex");
}

export function buildEnvFingerprint(): string {
  if (typeof process === "undefined") return crypto.createHash("sha256").update("{}").digest("hex");

  const envSlice: Record<string, string> = {};
  for (const key of ALLOWED_ENV_KEYS) {
    envSlice[key] = process.env[key] ?? "";
  }
  return crypto.createHash("sha256").update(JSON.stringify(envSlice)).digest("hex");
}

export type CaptureRuntimeContextInput = {
  contextHash: string;
  pointerEpoch: number;
  registry: Record<string, SelectorRuntimeSnapshot>;
  rollbackRegistry: Record<string, SelectorRuntimeSnapshot>;
  manifestSchemaHashes?: Record<string, string>;
  timestamp?: number;
};

export function captureRuntimeContextSnapshot(
  input: CaptureRuntimeContextInput,
): SelectorRuntimeContext {
  const snapshot: SelectorRuntimeContext = Object.freeze({
    timestamp: input.timestamp ?? Date.now(),
    pointerEpoch: input.pointerEpoch,
    registryHash: computeRegistryHash(
      input.registry,
      input.rollbackRegistry,
      input.manifestSchemaHashes,
    ),
    contextHash: input.contextHash,
    envFingerprint: buildEnvFingerprint(),
  });
  lastRuntimeContextSnapshot = snapshot;
  return snapshot;
}

export function getLastRuntimeContextSnapshot(): SelectorRuntimeContext | null {
  return lastRuntimeContextSnapshot;
}

export function __resetRuntimeContextSnapshotForTests(): void {
  lastRuntimeContextSnapshot = null;
}
