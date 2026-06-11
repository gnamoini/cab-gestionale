/**
 * Publish or verify selector runtime snapshot bundle from promotion registry.
 *
 * Usage:
 *   npx tsx scripts/selector-sync-effective-config.ts
 *   npx tsx scripts/selector-sync-effective-config.ts --check-only
 */
import {
  buildEffectiveSelectorConfig,
  validateSnapshotConsistency,
} from "@/lib/selector-core/selector-config-enforcer";
import { buildSelectorRuntimeSnapshotDeterministic } from "@/lib/selector-core/selector-config-snapshot";
import {
  buildOptionsFingerprint,
  clearBuildCheckpoint,
  reconcileAndPersistCheckpoints,
  resumeSelectorBuildPipeline,
  runSelectorBuildPipeline,
  runSelectorBuildPhase,
} from "@/lib/selector-core/selector-build-orchestrator";
import { clearDistributedCheckpointManifest } from "@/lib/selector-core/selector-distributed-checkpoint-manager";
import { runPrePublishGuardrails } from "@/lib/selector-core/selector-hard-guardrails";
import {
  DEFAULT_PROMOTION_REGISTRY_PATH,
  getActiveRegistryState,
  loadPromotionRegistry,
} from "@/lib/selector-core/selector-config-promotion-registry";

function main(): void {
  const checkOnly = process.argv.includes("--check-only");
  const resume = process.argv.includes("--resume");
  const clearCheckpoint = process.argv.includes("--clear-checkpoint");
  const reconcileCheckpoint = process.argv.includes("--reconcile-checkpoint");
  const phaseArg = process.argv.find((arg) => arg.startsWith("--phase="));
  const phase = phaseArg?.split("=")[1] as "validate" | "build" | "sync" | "verify" | undefined;

  if (reconcileCheckpoint) {
    const result = reconcileAndPersistCheckpoints();
    console.log(
      `checkpoint reconciled — epoch leader ${result.merged.leaderElectionId}; divergent nodes: ${result.divergent.join(", ") || "(none)"}`,
    );
    if (!resume && !phase && !checkOnly && clearCheckpoint && process.argv.length <= 4) {
      return;
    }
  }

  if (clearCheckpoint) {
    clearBuildCheckpoint();
    clearDistributedCheckpointManifest();
    console.log("selector build checkpoint cleared");
    if (!resume && !phase && !checkOnly && process.argv.length <= 3) {
      return;
    }
  }

  loadPromotionRegistry(DEFAULT_PROMOTION_REGISTRY_PATH);
  const registry = getActiveRegistryState();

  if (!checkOnly && !phase) {
    const effective = buildEffectiveSelectorConfig(registry);
    const expected = buildSelectorRuntimeSnapshotDeterministic(registry);
    runPrePublishGuardrails(registry, effective, expected);
  }

  if (phase) {
    const phaseResult = runSelectorBuildPhase(phase, {
      checkOnly,
      registry: checkOnly ? undefined : registry,
    });
    if (!phaseResult.ok) {
      console.error(`${phase} phase failed: ${phaseResult.error}`);
      process.exit(1);
    }
    console.log(`${phase} phase OK`);
    return;
  }

  const pipelineOptions = {
    checkOnly,
    registry: checkOnly ? undefined : registry,
  };

  const pipeline = resume
    ? resumeSelectorBuildPipeline(pipelineOptions)
    : runSelectorBuildPipeline(pipelineOptions);

  if (resume) {
    console.log(`selector build resumed (fingerprint ${buildOptionsFingerprint(pipelineOptions).slice(0, 12)}…)`);
  }

  if (checkOnly) {
    const result = validateSnapshotConsistency(registry);
    if (!result.consistent) {
      console.error("Active pointer snapshot mismatch vs registry-derived snapshot:");
      for (const line of result.diff) console.error(`  - ${line}`);
      process.exit(1);
    }
    console.log(
      `bundle consistent (${pipeline.bundledVersions.length} versions): ${pipeline.bundledVersions.join(", ")}; rollback-only: ${pipeline.rollbackOnlyVersions.join(", ") || "(none)"}`,
    );
    console.log(`GC candidates: ${pipeline.gcPlan.candidates.length}`);
    return;
  }

  console.log(
    `selector build OK — bundled: ${pipeline.bundledVersions.join(", ")}`,
  );

  const result = validateSnapshotConsistency(registry);
  console.log(result.consistent ? "consistency: OK" : `consistency FAILED: ${result.diff.join("; ")}`);
  if (!result.consistent) process.exit(1);
}

main();
