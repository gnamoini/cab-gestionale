/**
 * @advisory v5.3.2 — order-independent selector build pipeline with retryable phases. Node/fs only.
 * @advisory v5.3.3 — persistent checkpoint + resume across phases.
 * @advisory v5.3.4 — distributed checkpoint manifest coordination.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  clearDistributedCheckpointManifest,
  DEFAULT_BUILD_CHECKPOINT_PATH,
  readReconciledBuildCheckpoint,
  recordNodeCheckpoint,
  reconcileAndPersistCheckpoints,
  type BuildCheckpoint,
  type BuildPhaseName,
} from "@/lib/selector-core/selector-distributed-checkpoint-manager";
import {
  assertBundleRegistryConsistency,
  DEFAULT_BUNDLE_MANIFEST_PATH,
  type BundleRegistryConsistencyResult,
} from "@/lib/selector-core/selector-bundle-registry-consistency-check";
import { assertBoundedBundle } from "@/lib/selector-core/selector-build-dependency-guard";
import { reconcilePointerWithRetrySync } from "@/lib/selector-core/selector-distributed-pointer-guard";
import { readPointer, DEFAULT_POINTER_PATH } from "@/lib/selector-core/selector-snapshot-atomic-switch";
import {
  DEFAULT_GENERATED_SNAPSHOTS_DIR,
  DEFAULT_SNAPSHOT_REGISTRY_GENERATED_PATH,
  syncSnapshotBundleDetailed,
} from "@/lib/selector-core/selector-snapshot-bundle-sync";
import {
  classifySnapshotVersions,
} from "@/lib/selector-core/selector-snapshot-lifecycle-manager";
import { sortVersionsByRecency } from "@/lib/selector-core/selector-snapshot-pruner";
import {
  planSnapshotGc,
} from "@/lib/selector-core/selector-snapshot-gc-policy";
import { validateSnapshotSemanticsOrThrow } from "@/lib/selector-core/selector-snapshot-semantic-validator";
import { validateSnapshotOrThrow } from "@/lib/selector-core/selector-snapshot-schema-validator";
import {
  buildAndPublishSnapshot,
  DEFAULT_SNAPSHOT_STORE_DIR,
  getSnapshot,
  listSnapshots,
  readManifest,
} from "@/lib/selector-core/selector-snapshot-registry";
import type { GcPlan } from "@/lib/selector-core/selector-snapshot-gc-policy";
import { auditSelectorSystemComplexity } from "@/lib/selector-core/selector-determinism-gate-audit";
import type { ComplexityAuditResult } from "@/lib/selector-core/selector-determinism-gate";
import {
  resolveEnforcerMode,
  runUnifiedPolicyCheck,
  type UnifiedPolicyCheckResult,
} from "@/lib/selector-core/selector-api-usage-enforcer";
import type { ApiEnforcerReport } from "@/lib/selector-core/selector-api-enforcer-report";
import type { PolicyRuntimeConvergenceResult } from "@/lib/selector-core/selector-enforcement-ruleset";
import type { LifecycleClassification } from "@/lib/selector-core/selector-snapshot-lifecycle-manager";
import type { PromotionRegistryState } from "@/lib/selector-core/types";
import { debugObservation } from "@/lib/selector-core/selector-debug-observation";

export type BuildOrchestratorResult = {
  bundledVersions: string[];
  rollbackOnlyVersions: string[];
  consistency: BundleRegistryConsistencyResult;
  classification: LifecycleClassification;
  gcPlan: GcPlan;
  /** @advisory v5.5 — dev-only complexity audit attached post-build */
  complexityAudit?: ComplexityAuditResult;
  /** @advisory v6.0 — unified enforcement + convergence + canonical artifacts */
  unifiedPolicyReport?: UnifiedPolicyCheckResult;
  /** @deprecated v6.0 — use unifiedPolicyReport.enforcementReport */
  apiEnforcementReport?: ApiEnforcerReport;
  /** @deprecated v6.0 — use unifiedPolicyReport.convergenceReport */
  convergenceReport?: PolicyRuntimeConvergenceResult;
};

export type BuildOrchestratorOptions = {
  checkOnly?: boolean;
  registry?: PromotionRegistryState;
  storeDir?: string;
  pointerPath?: string;
  generatedSnapshotsDir?: string;
  registryGeneratedPath?: string;
  bundleManifestPath?: string;
  checkpointPath?: string;
};

export type { BuildPhaseName, BuildCheckpoint } from "@/lib/selector-core/selector-distributed-checkpoint-manager";

export type BuildPhaseResult<T = unknown> = {
  ok: boolean;
  phase: BuildPhaseName;
  result?: T;
  error?: string;
  retryable: boolean;
};

export {
  DEFAULT_BUILD_CHECKPOINT_PATH,
  DEFAULT_DISTRIBUTED_CHECKPOINT_MANIFEST_PATH,
} from "@/lib/selector-core/selector-distributed-checkpoint-manager";

const PHASE_ORDER: BuildPhaseName[] = [
  "validate",
  "build",
  "sync",
  "verify",
  "unifiedPolicyCheck",
];

export { PHASE_ORDER as SELECTOR_BUILD_PHASE_ORDER };

function resolveOptions(options: BuildOrchestratorOptions = {}) {
  return {
    storeDir: options.storeDir ?? DEFAULT_SNAPSHOT_STORE_DIR,
    pointerPath: options.pointerPath ?? DEFAULT_POINTER_PATH,
    generatedSnapshotsDir: options.generatedSnapshotsDir ?? DEFAULT_GENERATED_SNAPSHOTS_DIR,
    registryGeneratedPath: options.registryGeneratedPath ?? DEFAULT_SNAPSHOT_REGISTRY_GENERATED_PATH,
    bundleManifestPath: options.bundleManifestPath ?? DEFAULT_BUNDLE_MANIFEST_PATH,
    checkOnly: options.checkOnly ?? false,
    registry: options.registry,
    checkpointPath: options.checkpointPath ?? DEFAULT_BUILD_CHECKPOINT_PATH,
  };
}

export function buildOptionsFingerprint(options: BuildOrchestratorOptions = {}): string {
  const resolved = resolveOptions(options);
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        storeDir: resolved.storeDir,
        pointerPath: resolved.pointerPath,
        generatedSnapshotsDir: resolved.generatedSnapshotsDir,
        registryGeneratedPath: resolved.registryGeneratedPath,
        bundleManifestPath: resolved.bundleManifestPath,
        checkOnly: resolved.checkOnly,
        hasRegistry: Boolean(options.registry),
      }),
    )
    .digest("hex");
}

export function readBuildCheckpoint(
  optionsFingerprint?: string,
): BuildCheckpoint | null {
  return readReconciledBuildCheckpoint(optionsFingerprint);
}

export function writeBuildCheckpoint(
  checkpoint: BuildCheckpoint,
): void {
  recordNodeCheckpoint(checkpoint);
}

export function clearBuildCheckpoint(): void {
  clearDistributedCheckpointManifest();
}

export { reconcileAndPersistCheckpoints };

function isPhaseCompleteInCheckpoint(
  phase: BuildPhaseName,
  fingerprint: string,
  checkpoint: BuildCheckpoint | null,
): boolean {
  return (
    checkpoint?.optionsFingerprint === fingerprint &&
    checkpoint.phaseResults[phase]?.ok === true
  );
}

function recordPhaseCheckpoint(
  phase: BuildPhaseName,
  ok: boolean,
  options: BuildOrchestratorOptions,
): void {
  const fingerprint = buildOptionsFingerprint(options);
  const existing = readReconciledBuildCheckpoint(fingerprint);
  const checkpoint: BuildCheckpoint = {
    lastCompletedPhase: ok ? phase : existing?.lastCompletedPhase ?? null,
    completedAt: new Date().toISOString(),
    optionsFingerprint: fingerprint,
    phaseResults: {
      ...(existing?.optionsFingerprint === fingerprint ? existing.phaseResults : {}),
      [phase]: { ok, at: new Date().toISOString() },
    },
  };
  recordNodeCheckpoint(checkpoint);
}

export function validateStoreSnapshots(storeDir = DEFAULT_SNAPSHOT_STORE_DIR): void {
  for (const version of listSnapshots(storeDir)) {
    const snapshot = getSnapshot(version, storeDir);
    validateSnapshotOrThrow(snapshot);
  }
}

export function validatePhase(
  options: BuildOrchestratorOptions = {},
): BuildPhaseResult<{ classification: LifecycleClassification; gcPlan: GcPlan }> {
  try {
    const resolved = resolveOptions(options);
    validateStoreSnapshots(resolved.storeDir);

    const pointer = readPointer(resolved.pointerPath);
    const manifest = readManifest(path.join(resolved.storeDir, "manifest.json"));
    const storeVersions = listSnapshots(resolved.storeDir);
    const classification = classifySnapshotVersions(storeVersions, pointer, manifest);
    const gcPlan = planSnapshotGc(classification, manifest);

    const baselineVersion = pointer.activeVersion || manifest.activeVersion;
    if (baselineVersion && storeVersions.includes(baselineVersion)) {
      const baseline = getSnapshot(baselineVersion, resolved.storeDir);
      const recency = sortVersionsByRecency(storeVersions);
      const baselineIndex = recency.indexOf(baselineVersion);
      for (const version of storeVersions) {
        if (version === baselineVersion) continue;
        const versionIndex = recency.indexOf(version);
        const lifecycle = manifest.lifecycle?.[version];
        const isPipeline =
          lifecycle === "staged" ||
          lifecycle === "validated" ||
          lifecycle === "proposed";
        if (versionIndex > baselineIndex && !isPipeline) continue;
        const candidate = getSnapshot(version, resolved.storeDir);
        validateSnapshotSemanticsOrThrow(candidate, baseline);
      }
    }

    debugObservation.emit({
      module: "gc-policy",
      event: "planned",
      hint: `GC plan ready (${gcPlan.candidates?.length ?? 0} candidate(s)); inspect selector-snapshot-gc-policy`,
    });

    return {
      ok: true,
      phase: "validate",
      result: { classification, gcPlan },
      retryable: true,
    };
  } catch (error) {
    return {
      ok: false,
      phase: "validate",
      error: error instanceof Error ? error.message : String(error),
      retryable: true,
    };
  }
}

export function unifiedPolicyCheckPhase(
  _options: BuildOrchestratorOptions = {},
): BuildPhaseResult<{ report: UnifiedPolicyCheckResult }> {
  void _options;
  try {
    const report = runUnifiedPolicyCheck({ mode: resolveEnforcerMode() });
    if (report.shouldFail) {
      const enforcement = report.enforcementReport;
      return {
        ok: false,
        phase: "unifiedPolicyCheck",
        error: `Unified policy check failed (${enforcement.violations.length} import(s), ${enforcement.barrelViolations.length} barrel issue(s), severity=${report.convergenceReport.severity})`,
        retryable: false,
        result: { report },
      };
    }
    debugObservation.emit({
      module: "unifiedPolicyCheck",
      event: "completed",
      hint: "Policy convergence path: runUnifiedPolicyCheck → deriveConvergenceReport → ruleset",
    });

    return {
      ok: true,
      phase: "unifiedPolicyCheck",
      result: { report },
      retryable: true,
    };
  } catch (error) {
    return {
      ok: false,
      phase: "unifiedPolicyCheck",
      error: error instanceof Error ? error.message : String(error),
      retryable: false,
    };
  }
}

export function buildPhase(
  options: BuildOrchestratorOptions = {},
): BuildPhaseResult<{ published: boolean }> {
  try {
    const resolved = resolveOptions(options);
    if (resolved.checkOnly || !resolved.registry) {
      return { ok: true, phase: "build", result: { published: false }, retryable: true };
    }
    buildSnapshotArtifacts(resolved.registry, resolved.storeDir, resolved.pointerPath);
    return { ok: true, phase: "build", result: { published: true }, retryable: true };
  } catch (error) {
    return {
      ok: false,
      phase: "build",
      error: error instanceof Error ? error.message : String(error),
      retryable: true,
    };
  }
}

export function syncPhase(
  options: BuildOrchestratorOptions = {},
): BuildPhaseResult<{ bundledVersions: string[]; rollbackOnlyVersions: string[] }> {
  try {
    const resolved = resolveOptions(options);
    const pointer = reconcilePointerWithRetrySync(() => readPointer(resolved.pointerPath));
    const manifest = readManifest(path.join(resolved.storeDir, "manifest.json"));
    const storeVersions = listSnapshots(resolved.storeDir);
    const classification = classifySnapshotVersions(storeVersions, pointer, manifest);
    assertBoundedBundle(classification.bundleVersions.length);

    const syncResult = syncSnapshotBundleDetailed(
      resolved.storeDir,
      resolved.generatedSnapshotsDir,
      resolved.registryGeneratedPath,
      classification.bundleVersions,
      resolved.pointerPath,
      resolved.bundleManifestPath,
    );

    debugObservation.emit({
      module: "snapshot-sync",
      event: "bundled",
      hint: `Bundled ${syncResult.bundledVersions.length} version(s); verify pointer + bundle manifest`,
    });

    return {
      ok: true,
      phase: "sync",
      result: syncResult,
      retryable: true,
    };
  } catch (error) {
    return {
      ok: false,
      phase: "sync",
      error: error instanceof Error ? error.message : String(error),
      retryable: true,
    };
  }
}

export function verifyPhase(
  options: BuildOrchestratorOptions = {},
  bundledVersions?: string[],
): BuildPhaseResult<{ consistency: BundleRegistryConsistencyResult }> {
  try {
    const resolved = resolveOptions(options);
    const consistency = assertBundleRegistryConsistency({
      storeDir: resolved.storeDir,
      generatedSnapshotsDir: resolved.generatedSnapshotsDir,
      registryGeneratedPath: resolved.registryGeneratedPath,
      bundledVersions,
      pointerPath: resolved.pointerPath,
    });
    return {
      ok: true,
      phase: "verify",
      result: { consistency },
      retryable: true,
    };
  } catch (error) {
    return {
      ok: false,
      phase: "verify",
      error: error instanceof Error ? error.message : String(error),
      retryable: true,
    };
  }
}

export function buildSnapshotArtifacts(
  registry: PromotionRegistryState,
  storeDir = DEFAULT_SNAPSHOT_STORE_DIR,
  pointerPath = DEFAULT_POINTER_PATH,
): void {
  buildAndPublishSnapshot(registry, { storeDir, pointerPath });
}

export function runSelectorBuildPipeline(
  options: BuildOrchestratorOptions = {},
): BuildOrchestratorResult {
  return executeBuildPipeline(options, false);
}

export function resumeSelectorBuildPipeline(
  options: BuildOrchestratorOptions = {},
): BuildOrchestratorResult {
  return executeBuildPipeline(options, true);
}

function readBundledVersionsFromManifest(bundleManifestPath: string): {
  bundledVersions: string[];
  rollbackOnlyVersions: string[];
} {
  if (!fs.existsSync(bundleManifestPath)) {
    return { bundledVersions: [], rollbackOnlyVersions: [] };
  }
  const manifest = JSON.parse(fs.readFileSync(bundleManifestPath, "utf8")) as {
    versions?: string[];
    rollbackVersions?: string[];
  };
  return {
    bundledVersions: manifest.versions ?? [],
    rollbackOnlyVersions: manifest.rollbackVersions ?? [],
  };
}

function executeBuildPipeline(
  options: BuildOrchestratorOptions,
  resume: boolean,
): BuildOrchestratorResult {
  const resolved = resolveOptions(options);
  const fingerprint = buildOptionsFingerprint(options);
  const checkpoint = resume ? readReconciledBuildCheckpoint(fingerprint) : null;
  const skipPhase = (phase: BuildPhaseName): boolean =>
    resume && isPhaseCompleteInCheckpoint(phase, fingerprint, checkpoint);

  const validate = skipPhase("validate")
    ? { ok: true, phase: "validate" as const, retryable: true }
    : validatePhase(options);
  if (!skipPhase("validate")) {
    recordPhaseCheckpoint("validate", validate.ok, options);
  }
  if (!validate.ok) {
    throw new Error(`validatePhase failed: ${validate.error}`);
  }
  const validateMeta = validate.result ?? validatePhase(options).result;
  if (!validateMeta) {
    throw new Error("validatePhase failed: missing classification");
  }

  const build = skipPhase("build")
    ? { ok: true, phase: "build" as const, retryable: true, result: { published: false } }
    : buildPhase(options);
  if (!skipPhase("build")) {
    recordPhaseCheckpoint("build", build.ok, options);
  }
  if (!build.ok) {
    throw new Error(`buildPhase failed: ${build.error}`);
  }

  let syncResult: { bundledVersions: string[]; rollbackOnlyVersions: string[] };
  if (skipPhase("sync")) {
    syncResult = readBundledVersionsFromManifest(resolved.bundleManifestPath);
  } else {
    const sync = syncPhase(options);
    recordPhaseCheckpoint("sync", sync.ok, options);
    if (!sync.ok || !sync.result) {
      throw new Error(`syncPhase failed: ${sync.error}`);
    }
    syncResult = sync.result;
  }

  const verify = verifyPhase(options, syncResult.bundledVersions);
  if (!skipPhase("verify")) {
    recordPhaseCheckpoint("verify", verify.ok, options);
  }
  if (!verify.ok || !verify.result) {
    throw new Error(`verifyPhase failed: ${verify.error}`);
  }

  const unifiedPolicy = skipPhase("unifiedPolicyCheck")
    ? { ok: true, phase: "unifiedPolicyCheck" as const, retryable: true }
    : unifiedPolicyCheckPhase(options);
  if (!skipPhase("unifiedPolicyCheck")) {
    recordPhaseCheckpoint("unifiedPolicyCheck", unifiedPolicy.ok, options);
  }
  if (!unifiedPolicy.ok) {
    throw new Error(`unifiedPolicyCheckPhase failed: ${unifiedPolicy.error}`);
  }
  const unifiedPolicyReport =
    unifiedPolicy.result?.report ??
    runUnifiedPolicyCheck({ mode: resolveEnforcerMode() });

  clearDistributedCheckpointManifest();

  const pointer = readPointer(resolved.pointerPath);
  const manifest = readManifest(path.join(resolved.storeDir, "manifest.json"));
  const classification = classifySnapshotVersions(
    listSnapshots(resolved.storeDir),
    pointer,
    manifest,
  );

  const complexityAudit =
    typeof process !== "undefined" &&
    (process.env.NODE_ENV !== "production" ||
      process.env.SELECTOR_TELEMETRY_DEBUG === "true")
      ? auditSelectorSystemComplexity()
      : undefined;

  return {
    bundledVersions: syncResult.bundledVersions,
    rollbackOnlyVersions: syncResult.rollbackOnlyVersions,
    consistency: verify.result.consistency,
    classification,
    gcPlan: validateMeta.gcPlan,
    complexityAudit,
    unifiedPolicyReport,
    apiEnforcementReport: unifiedPolicyReport.enforcementReport,
    convergenceReport: unifiedPolicyReport.convergenceReport,
  };
}

export function runSelectorBuildPhase(
  phase: BuildPhaseName,
  options: BuildOrchestratorOptions = {},
): BuildPhaseResult {
  switch (phase) {
    case "validate":
      return validatePhase(options);
    case "unifiedPolicyCheck":
      return unifiedPolicyCheckPhase(options);
    case "build":
      return buildPhase(options);
    case "sync":
      return syncPhase(options);
    case "verify":
      return verifyPhase(options);
    default:
      return { ok: false, phase, error: `Unknown phase: ${phase}`, retryable: false };
  }
}
