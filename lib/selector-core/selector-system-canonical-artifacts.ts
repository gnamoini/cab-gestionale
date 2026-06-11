/**
 * @advisory v6.0 — single in-memory canonical artifact model (no policy JSON files).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ApiEnforcerReport } from "@/lib/selector-core/selector-api-enforcer-report";
import type { PolicyRuntimeConvergenceResult } from "@/lib/selector-core/selector-enforcement-ruleset";

const ROOT = process.cwd();

export const DEFAULT_POINTER_ARTIFACT_PATH =
  "lib/selector-core/generated/selector-active-pointer.json";
export const DEFAULT_BUNDLE_MANIFEST_ARTIFACT_PATH =
  "lib/selector-core/generated/selector-bundle-manifest.json";

export type SelectorSystemCanonicalArtifacts = {
  rulesetHash: string;
  runtimeSnapshotHash: string;
  runtimeExportFingerprint: string;
  enforcementHash: string;
  convergenceHash: string;
};

function hashPayload(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function readRuntimeSnapshotHash(options?: {
  pointerPath?: string;
  manifestPath?: string;
}): string {
  const pointerPath = options?.pointerPath ?? DEFAULT_POINTER_ARTIFACT_PATH;
  const manifestPath = options?.manifestPath ?? DEFAULT_BUNDLE_MANIFEST_ARTIFACT_PATH;
  const pointerAbs = path.join(ROOT, pointerPath);
  const manifestAbs = path.join(ROOT, manifestPath);

  if (!fs.existsSync(pointerAbs) || !fs.existsSync(manifestAbs)) {
    return hashPayload({ missing: true });
  }

  try {
    const pointer = JSON.parse(fs.readFileSync(pointerAbs, "utf8")) as {
      activeVersion?: string;
      previousVersion?: string;
    };
    const manifest = JSON.parse(fs.readFileSync(manifestAbs, "utf8")) as {
      versions?: string[];
      schemaHashes?: Record<string, string>;
    };
    const activeVersion = pointer.activeVersion ?? "";
    const schemaHash = manifest.schemaHashes?.[activeVersion] ?? "";
    return hashPayload({
      activeVersion,
      previousVersion: pointer.previousVersion ?? "",
      schemaHash,
      versions: [...(manifest.versions ?? [])].sort(),
    });
  } catch {
    return hashPayload({ invalid: true });
  }
}

export function computeEnforcementHash(report: ApiEnforcerReport): string {
  return hashPayload({
    barrelViolations: [...report.barrelViolations].sort(),
    violationCount: report.violations.length,
    legacyShimCount: report.legacyShimUsage.length,
    internalUsageCount: report.internalUsage.length,
    safeBypassCount: report.safeBypassCandidates.length,
    shouldFail: report.shouldFail,
  });
}

export function computeConvergenceHash(input: {
  rulesetHash: string;
  runtimeSnapshotHash: string;
  runtimeExportFingerprint: string;
}): string {
  return hashPayload({
    rulesetHash: input.rulesetHash,
    runtimeSnapshotHash: input.runtimeSnapshotHash,
    runtimeExportFingerprint: input.runtimeExportFingerprint,
  });
}

export function computeCanonicalArtifacts(input: {
  rulesetHash: string;
  runtimeExportFingerprint: string;
  enforcementReport: ApiEnforcerReport;
  convergenceReport: PolicyRuntimeConvergenceResult;
  runtimeSnapshotHash?: string;
}): SelectorSystemCanonicalArtifacts {
  const runtimeSnapshotHash =
    input.runtimeSnapshotHash ?? readRuntimeSnapshotHash();
  const enforcementHash = computeEnforcementHash(input.enforcementReport);
  const convergenceHash = computeConvergenceHash({
    rulesetHash: input.rulesetHash,
    runtimeSnapshotHash,
    runtimeExportFingerprint: input.runtimeExportFingerprint,
  });

  return {
    rulesetHash: input.rulesetHash,
    runtimeSnapshotHash,
    runtimeExportFingerprint: input.runtimeExportFingerprint,
    enforcementHash,
    convergenceHash,
  };
}
