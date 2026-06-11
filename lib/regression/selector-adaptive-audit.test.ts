/**
 * Audit v4/v5/v5.3.1 adaptive layers — no runtime coupling with decision engine.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { assertNoImplicitOrdering } from "@/lib/selector-core/selector-build-dependency-guard";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const engine = read("lib/selector-core/selector-decision-engine.ts");
const bridge = read("lib/selector-core/selector-telemetry-bridge.ts");
const globalSelect = read("components/gestionale/global-input/global-select.tsx");
const engineConfig = read("lib/selector-core/selector-engine-config.ts");
const generateProposals = read("scripts/selector-generate-proposals.ts");
const reviewProposals = read("scripts/selector-review-proposals.ts");
const syncConfig = read("scripts/selector-sync-effective-config.ts");
const runtimeLoader = read("lib/selector-core/selector-config-runtime-loader.ts");
const versionResolver = read("lib/selector-core/selector-runtime-version-resolver.ts");
const enforcer = read("lib/selector-core/selector-config-enforcer.ts");
const snapshotRegistry = read("lib/selector-core/selector-snapshot-registry.ts");

assert.match(read("lib/selector-core/selector-adaptive-analyzer.ts"), /analyzeSelectorTelemetry/);
assert.match(read("lib/selector-core/selector-insight-promotion-engine.ts"), /generateProposalsFromReport/);
assert.match(read("lib/selector-core/selector-ab-simulator.ts"), /compareOutcomes/);
assert.match(read("lib/selector-core/selector-config-promotion-registry.ts"), /approveProposal/);
assert.match(read("lib/selector-core/selector-config-snapshot.ts"), /buildSelectorRuntimeSnapshot/);
assert.match(read("lib/selector-core/selector-snapshot-schema-validator.ts"), /validateSnapshot/);
assert.match(read("lib/selector-core/selector-snapshot-atomic-switch.ts"), /atomicPointerActivate/);
assert.match(read("lib/selector-core/selector-build-orchestrator.ts"), /validatePhase/);
assert.match(read("lib/selector-core/selector-build-orchestrator.ts"), /syncPhase/);
assert.match(read("lib/selector-core/selector-snapshot-lifecycle-manager.ts"), /classifySnapshotVersions/);
assert.match(read("lib/selector-core/selector-snapshot-semantic-validator.ts"), /validateSnapshotSemantics/);
assert.match(read("lib/selector-core/selector-distributed-pointer-guard.ts"), /detectPointerDrift/);
assert.match(runtimeLoader, /ROLLBACK_SNAPSHOT_REGISTRY/);
assert.match(runtimeLoader, /selector-bundle-manifest.json/);
assert.match(snapshotRegistry, /stageSnapshot/);
assert.match(snapshotRegistry, /rollbackSnapshot/);

const offlineOnlyPattern =
  /selector-adaptive|selector-insight-promotion|selector-ab-simulator|selector-config-promotion|selector-config-snapshot|selector-snapshot-registry|selector-snapshot-schema|selector-snapshot-atomic|selector-snapshot-bundle|selector-snapshot-pruner|selector-build-orchestrator|selector-bundle-registry|selector-post-apply|selector-confidence-model|selector-hard-guardrails|selector-config-enforcer/;

assert.doesNotMatch(engine, offlineOnlyPattern);
assert.doesNotMatch(bridge, offlineOnlyPattern);
assert.doesNotMatch(globalSelect, offlineOnlyPattern);

assert.match(runtimeLoader, /loadLatestSelectorSnapshot/);
assert.match(runtimeLoader, /selector-active-pointer.json/);
assert.match(runtimeLoader, /SNAPSHOT_REGISTRY/);
assert.match(runtimeLoader, /resolveEffectiveVersion/);
assert.match(runtimeLoader, /assertPreResolutionConsistency/);
assert.match(runtimeLoader, /traceFallbackResolution/);
assert.match(runtimeLoader, /validateDeterminism/);
assert.match(runtimeLoader, /captureRuntimeContextSnapshot/);
assert.doesNotMatch(runtimeLoader, /recordNodeCheckpoint/);
assert.match(runtimeLoader, /selector-determinism-gate/);
assert.match(runtimeLoader, /selector-fallback-trace/);
assert.doesNotMatch(runtimeLoader, /selector-causal-semantic-router/);
assert.doesNotMatch(runtimeLoader, /getExplanation/);
assert.doesNotMatch(runtimeLoader, /buildUnifiedSelectorCausalModel/);
assert.doesNotMatch(runtimeLoader, /getSelectorExplanation/);
assert.doesNotMatch(runtimeLoader, /buildUnifiedCausalIndex/);

const indexSource = read("lib/selector-core/index.ts");
assert.doesNotMatch(
  indexSource,
  /from ["']@\/lib\/selector-core\/selector-unified-causal-index/,
);
assert.doesNotMatch(
  indexSource,
  /from ["']@\/lib\/selector-core\/selector-causal-decision-graph/,
);
assert.doesNotMatch(
  indexSource,
  /from ["']@\/lib\/selector-core\/selector-temporal-lineage-graph/,
);
assert.doesNotMatch(indexSource, /routeCausalExplanation/);
assert.doesNotMatch(indexSource, /getUserExplanationBundle/);
assert.doesNotMatch(indexSource, /buildUnifiedSelectorCausalModel/);
assert.match(indexSource, /Cognitive cluster barrel/);
assert.match(read("lib/selector-core/selector-api-surface-registry.ts"), /ALLOWED_COGNITIVE_CLUSTER_PUBLIC_API/);
assert.match(read("lib/selector-core/selector-api-usage-enforcer.ts"), /runUnifiedPolicyCheck/);
assert.match(read("lib/selector-core/selector-system-canonical-artifacts.ts"), /computeCanonicalArtifacts/);
assert.match(read("lib/selector-core/selector-build-orchestrator.ts"), /unifiedPolicyCheckPhase/);
assert.doesNotMatch(runtimeLoader, /selector-api-usage-enforcer/);
assert.doesNotMatch(runtimeLoader, /selector-api-enforcer-report/);
assert.doesNotMatch(read("lib/selector-core/selector-decision-engine.ts"), /selector-api-usage-enforcer/);
assert.match(read("lib/selector-core/selector-enforcement-ruleset.ts"), /ALLOWED_COGNITIVE_CLUSTER_PUBLIC_API/);
assert.match(read("lib/selector-core/selector-build-orchestrator.ts"), /unifiedPolicyCheck/);
assert.doesNotMatch(runtimeLoader, /selector-enforcement-ruleset/);
assert.doesNotMatch(runtimeLoader, /selector-system-canonical-artifacts/);
const enforcerSource = read("lib/selector-core/selector-api-usage-enforcer.ts");
assert.doesNotMatch(enforcerSource, /selector-policy-convergence\.fingerprint\.json/);
assert.match(enforcerSource, /runPolicyRuntimeConvergenceCheck/);
assert.match(read("lib/selector-core/selector-observation-registry.ts"), /SelectorObservationIndex/);
assert.match(read("lib/selector-core/selector-debug-dsl-engine.ts"), /executeDebugQuery/);
assert.match(read("lib/selector-core/selector-build-orchestrator.ts"), /debugObservation\.emit/);
assert.doesNotMatch(runtimeLoader, /selector-debug-observation/);
assert.doesNotMatch(runtimeLoader, /selector-observation-registry-builder/);
assert.doesNotMatch(runtimeLoader, /selector-debug-dsl-engine/);
assert.doesNotMatch(read("lib/selector-core/selector-decision-engine.ts"), /selector-debug-observation/);
assert.doesNotMatch(read("lib/selector-core/selector-explainability.ts"), /selector-debug-observation/);
assert.match(read("lib/selector-core/selector-observation-registry-builder.ts"), /buildObservationRegistry/);
assert.match(read("lib/selector-core/selector-debug-dsl-registry.ts"), /DEBUG_DSL_REGISTRY/);
assert.match(read("lib/selector-core/selector-explanation-kernel.ts"), /resolveExplanation/);
assert.doesNotMatch(runtimeLoader, /selector-explanation-kernel/);
assert.doesNotMatch(runtimeLoader, /selector-architecture-time-machine/);
assert.doesNotMatch(read("lib/selector-core/selector-explainability.ts"), /selector-explanation-kernel/);

const explainabilitySource = read("lib/selector-core/selector-explainability.ts");
assert.match(explainabilitySource, /routeCausalExplanation/);
assert.doesNotMatch(explainabilitySource, /buildUnifiedSelectorCausalModel/);
assert.match(runtimeLoader, /revalidateRuntimeSnapshot/);
assert.doesNotMatch(runtimeLoader, /selector-active-snapshot.json/);
assert.doesNotMatch(runtimeLoader, /NEXT_PUBLIC_SELECTOR_ACTIVE_VERSION/);
assertNoImplicitOrdering(runtimeLoader, "runtimeLoader");

assert.match(versionResolver, /resolveEffectiveVersion/);
assert.match(versionResolver, /NODE_ENV === "development"/);

assert.match(engineConfig, /resolveSelectorEngineConfig/);
assert.doesNotMatch(engineConfig, /@selector-config-managed-start/);
assert.doesNotMatch(enforcer, /writeFileSync\([\s\S]*selector-engine-config/);
assert.doesNotMatch(snapshotRegistry, /writeFileSync\([\s\S]*selector-active-snapshot/);

assert.doesNotMatch(generateProposals, /writeFileSync\([\s\S]*selector-engine-config/);
assert.doesNotMatch(reviewProposals, /writeFileSync\([\s\S]*selector-engine-config/);
assert.doesNotMatch(syncConfig, /writeFileSync\([\s\S]*selector-engine-config/);
assert.match(syncConfig, /runSelectorBuildPipeline/);
assert.match(syncConfig, /resumeSelectorBuildPipeline/);
assert.match(syncConfig, /clearBuildCheckpoint/);
assert.match(syncConfig, /reconcileAndPersistCheckpoints/);
assert.match(reviewProposals, /buildAndPublishSnapshot/);
assert.doesNotMatch(reviewProposals, /applyEffectiveConfigToEngineFile/);

assert.match(enforcer, /readActiveBundledSnapshot/);
assert.ok(fs.existsSync(path.join(ROOT, "lib/selector-core/generated/selector-active-pointer.json")));
assert.ok(fs.existsSync(path.join(ROOT, "lib/selector-core/generated/selector-snapshot-registry.generated.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "lib/selector-core/generated/selector-rollback-registry.generated.ts")));

console.log("selector-adaptive-audit.test.ts OK");
