/**
 * Form UX Migration Engine — coverage and pilot assertions.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  MISMATCH_ROLLBACK_THRESHOLD,
  MISMATCH_ROLLBACK_WINDOW_MS,
} from "@/lib/form-ux-migration/guardrails";
import { FORM_UX_ROLLOUT } from "@/lib/form-ux-migration/rollout-config";
import { INPUT_KIND_SSOT } from "@/lib/form-ux-migration/registry";
import { resolveFormFieldMode } from "@/lib/form-ux-migration/resolve-form-field-mode";
import { compareFormUxValues } from "@/lib/form-ux-migration/normalize-and-compare";
import { FORM_UX_MIGRATION_LOG_PREFIX } from "@/lib/form-ux-migration/telemetry";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel: string): void {
  assert.ok(fs.existsSync(path.join(ROOT, rel)), `missing ${rel}`);
}

// Engine modules exist
exists("lib/form-ux-migration/types.ts");
exists("lib/form-ux-migration/registry.ts");
exists("lib/form-ux-migration/rollout-config.ts");
exists("lib/form-ux-migration/config.ts");
exists("lib/form-ux-migration/resolve-form-field-mode.ts");
exists("lib/form-ux-migration/normalize-and-compare.ts");
exists("lib/form-ux-migration/telemetry.ts");
exists("lib/form-ux-migration/guardrails.ts");
exists("lib/form-ux-migration/index.ts");
exists("lib/form-ux-migration/evaluate-ssot-snapshot.ts");
exists("lib/form-ux-migration/run-shadow-evaluation.ts");
exists("lib/form-ux-migration/shadow-config.ts");
exists("lib/form-ux-migration/device-context.ts");
exists("lib/form-ux-migration/resolve-field-enforcement.ts");
exists("lib/form-ux-migration/form-ux-field-registry.ts");
exists("lib/form-ux-migration/run-enforcement-evaluation.ts");
exists("lib/form-ux-migration/resolve-form-submit-payload.ts");
exists("lib/form-ux-migration/enforcement-guardrails.ts");
exists("lib/form-ux-migration/rollout-state-machine.ts");
exists("lib/form-ux-migration/rollout-state-guard.ts");
exists("lib/form-ux-migration/rollout-controller.ts");
exists("lib/form-ux-migration/auto-rollback-engine.ts");
exists("lib/form-ux-migration/rollout-state-store.ts");
exists("lib/form-ux-migration/rollout-rollback-executor.ts");

// React wrappers
exists("components/form-ux-migration/migrated-number-input.tsx");
exists("components/form-ux-migration/migrated-text-input.tsx");
exists("components/form-ux-migration/form-ux-migration-provider.tsx");
exists("components/form-ux-migration/use-shadow-field-evaluation.ts");
exists("components/form-ux-migration/use-form-ux-field-evaluation.ts");

// Registry covers all kinds
assert.ok(INPUT_KIND_SSOT.number);
assert.ok(INPUT_KIND_SSOT.text);
assert.equal(INPUT_KIND_SSOT.number.component, "GestionaleNumberInput");

// Guardrail thresholds documented in source
const guardrails = read("lib/form-ux-migration/guardrails.ts");
assert.match(guardrails, new RegExp(`MISMATCH_ROLLBACK_THRESHOLD = ${MISMATCH_ROLLBACK_THRESHOLD}`));
assert.match(guardrails, /MISMATCH_ROLLBACK_WINDOW_MS = 60/);
assert.equal(MISMATCH_ROLLBACK_WINDOW_MS, 60_000);

// Telemetry prefix + rollout state events
const telemetry = read("lib/form-ux-migration/telemetry.ts");
assert.match(telemetry, new RegExp(FORM_UX_MIGRATION_LOG_PREFIX.replace(/[[\]]/g, "\\$&")));
assert.match(telemetry, /evaluation/);
assert.match(telemetry, /emitFormUxRolloutStateEvent/);
assert.match(telemetry, /rolloutStateEvents/);

// Pilot rollout: ricambio prezzo-listino in shadow + enforcement warn
assert.equal(FORM_UX_ROLLOUT.ricambio.fields["prezzo-listino"]?.mode, "shadow");
assert.equal(FORM_UX_ROLLOUT.ricambio.fields["prezzo-listino"]?.kind, "number");
assert.equal(FORM_UX_ROLLOUT.ricambio.fields["prezzo-listino"]?.enforcement, "warn");
assert.equal(FORM_UX_ROLLOUT.ricambio.fields["prezzo-listino"]?.stateKey, "prezzoFornitoreOriginale");

const resolution = resolveFormFieldMode("ricambio", "prezzo-listino");
assert.equal(resolution.effectiveMode, "shadow");
assert.equal(resolution.showLegacy, true);
assert.equal(resolution.showSsot, false);
assert.equal(resolution.activeOnChange, "legacy");

// Normalizer: number equivalence
const cmp = compareFormUxValues("number", "1.0", "1");
assert.equal(cmp.match, true);

// Ricambio form uses MigratedNumberInput for prezzo listino
const ricambioForm = read("components/gestionale/magazzino/ricambio-form-fields.tsx");
assert.match(ricambioForm, /MigratedNumberInput/);
assert.match(ricambioForm, /fieldId="prezzo-listino"/);
assert.match(ricambioForm, /formId="ricambio"/);
assert.doesNotMatch(
  ricambioForm,
  /Prezzo listino[\s\S]{0,400}<input[\s\S]{0,200}type="number"/,
);

// Event-driven shadow: no parallel SSOT mirror DOM
const migratedNumber = read("components/form-ux-migration/migrated-number-input.tsx");
assert.doesNotMatch(migratedNumber, /SHADOW_MIRROR_CLASS/);
assert.doesNotMatch(migratedNumber, /pointer-events-none/);
assert.match(migratedNumber, /useFormUxFieldEvaluation/);

const migratedText = read("components/form-ux-migration/migrated-text-input.tsx");
assert.doesNotMatch(migratedText, /SHADOW_MIRROR_CLASS/);
assert.match(migratedText, /useFormUxFieldEvaluation/);

// evaluateSSOTSnapshot exported
const evalSrc = read("lib/form-ux-migration/evaluate-ssot-snapshot.ts");
assert.match(evalSrc, /export function evaluateSSOTSnapshot/);

// Scripts exist
exists("scripts/form-ux-migration-inventory.ts");
exists("scripts/form-ux-migration-codemod.ts");
exists("lib/regression/form-ux-migration-shadow-evaluator.test.ts");
exists("lib/regression/form-ux-migration-enforcement.test.ts");
exists("lib/regression/rollout-state-machine.test.ts");
exists("lib/regression/rollout-controller.test.ts");
exists("lib/regression/auto-rollback-engine.test.ts");
exists("lib/regression/form-ux-submit-determinism.test.ts");
exists("lib/regression/form-ux-execution-token.test.ts");
exists("lib/regression/form-ux-snapshot-immutability.test.ts");
exists("lib/regression/form-ux-atomic-transaction.test.ts");
exists("lib/regression/form-ux-race-condition.test.ts");
exists("lib/regression/form-ux-rollback-non-interference.test.ts");
exists("lib/form-ux-migration/form-ux-execution-token.ts");
exists("lib/form-ux-migration/form-ux-snapshot.ts");
exists("lib/form-ux-migration/rollout-state-lock.ts");
exists("lib/form-ux-migration/atomic-rollout-transaction.ts");
exists("lib/form-ux-migration/post-submit-rollback-observer.ts");
exists("lib/form-ux-migration/form-ux-platform-config.ts");
exists("lib/form-ux-migration/form-ux-registry.ts");
exists("lib/form-ux-migration/form-ux-execution-context.ts");
exists("lib/form-ux-migration/form-ux-orchestrator.ts");
exists("lib/form-ux-migration/cross-form-rollback-coordinator.ts");
exists("lib/form-ux-migration/form-ux-submit-router.ts");
exists("lib/regression/form-ux-orchestrator.test.ts");
exists("lib/regression/cross-form-isolation.test.ts");
exists("lib/regression/multi-form-rollback.test.ts");
exists("lib/regression/submit-routing.test.ts");
exists("lib/regression/form-ux-boundary-gate.test.ts");
exists("lib/regression/form-ux-legacy-bypass.test.ts");
exists("lib/regression/form-ux-global-interception.test.ts");
exists("lib/regression/form-ux-enforcement-phase.test.ts");
exists("lib/regression/form-ux-governance-plane.test.ts");
exists("lib/regression/governance-drift-detection.test.ts");
exists("lib/regression/governance-reconciliation.test.ts");
exists("lib/regression/single-decision-api.test.ts");
exists("lib/regression/form-ux-governance-authority.test.ts");
exists("lib/regression/authority-resolution-rules.test.ts");
exists("lib/regression/authority-vs-ugp-drift.test.ts");
exists("lib/regression/authority-blocking-behavior.test.ts");
exists("lib/regression/form-ux-governance-collapse.test.ts");
exists("lib/regression/collapse-determinism.test.ts");
exists("lib/regression/ugp-deprecation-safety.test.ts");
exists("lib/regression/gaml-single-source-enforcement.test.ts");
exists("lib/form-ux-migration/form-ux-governance-plane.ts");
exists("lib/form-ux-migration/form-ux-governance-collapse-plane.ts");
exists("lib/form-ux-migration/form-ux-governance-policy-engine.ts");
exists("lib/form-ux-migration/form-ux-governance-authority.ts");
exists("lib/form-ux-migration/form-ux-enforcement-policy.ts");
exists("lib/form-ux-migration/form-ux-legacy-guard.ts");
exists("lib/form-ux-migration/form-ux-boundary-gate.ts");
exists("components/form-ux-migration/form-ux-boundary-bootstrap.tsx");
exists("scripts/form-ux-prepare-ssot-enforcement.ts");

const shadowConfig = read("lib/form-ux-migration/shadow-config.ts");
assert.match(shadowConfig, /FORM_UX_MISMATCH_RATE_THRESHOLD/);
assert.match(shadowConfig, /FORM_UX_AUTO_ROLLBACK_MISMATCH_RATE/);

const controller = read("lib/form-ux-migration/rollout-controller.ts");
assert.match(controller, /computeRolloutEnforcement/);
assert.match(controller, /commitRolloutState/);
assert.match(controller, /RolloutComputeContext/);

const submitPayload = read("lib/form-ux-migration/resolve-form-submit-payload.ts");
assert.match(submitPayload, /computeFormSubmitPayload/);
assert.match(submitPayload, /atomicFormSubmitTransaction/);
assert.match(submitPayload, /compareFormUxValues/);
assert.doesNotMatch(submitPayload, /processSubmitDivergenceRollback/);

const hook = read("components/form-ux-migration/use-form-ux-field-evaluation.ts");
assert.match(hook, /gateFieldEvaluation/);
assert.doesNotMatch(hook, /atomicRolloutTransaction/);
assert.match(hook, /createFormUxExecutionToken/);

const enforcementGuardrailsSrc = read("lib/form-ux-migration/enforcement-guardrails.ts");
assert.match(enforcementGuardrailsSrc, /gateRollbackDispatch/);
assert.doesNotMatch(enforcementGuardrailsSrc, /executeRolloutRollback/);

const boundaryGate = read("lib/form-ux-migration/form-ux-boundary-gate.ts");
assert.match(boundaryGate, /installFormUxGlobalInterceptors/);
assert.match(boundaryGate, /gateFormSubmit/);

assert.match(telemetry, /emitFormUxBoundaryViolationEvent/);
assert.match(telemetry, /boundaryViolationBuffer/);
assert.match(telemetry, /emitFormUxGovernanceDriftEvent/);
assert.match(telemetry, /governanceDriftBuffer/);
assert.match(telemetry, /emitFormUxGovernanceAuthorityViolationEvent/);
assert.match(telemetry, /authorityViolationBuffer/);
assert.match(telemetry, /emitFormUxGovernanceCollapseEvent/);
assert.match(telemetry, /governanceCollapseBuffer/);
assert.match(telemetry, /emitFormUxSgclRoutingEvent/);
assert.match(telemetry, /sgclRoutingBuffer/);

const sgclRouter = read("lib/form-ux-migration/form-ux-governance-collapse-router.ts");
assert.match(sgclRouter, /routeGovernanceDecision/);
assert.match(sgclRouter, /routeGovernancePhaseGlobal/);
assert.match(sgclRouter, /fallbackHopGuard/);
assert.doesNotMatch(sgclRouter, /Math\.max/);

const governanceCollapseP3 = read("lib/form-ux-migration/form-ux-governance-collapse-plane.ts");
assert.match(governanceCollapseP3, /resolveConsumerGovernanceView/);
assert.match(governanceCollapseP3, /getFormUxGovernanceDecisionInternal/);

const enforcementResolver = read("lib/form-ux-migration/resolve-field-enforcement.ts");
assert.match(enforcementResolver, /computeRolloutEnforcement/);

const guardrailsSrc = read("lib/form-ux-migration/guardrails.ts");
assert.doesNotMatch(guardrailsSrc, /isFormUxFieldRollbackActive/);

const platformRegistry = read("lib/form-ux-migration/form-ux-registry.ts");
assert.match(platformRegistry, /getFormUxRegistry/);
assert.match(platformRegistry, /FormUxRegistryEntry/);
assert.match(platformRegistry, /deriveRegistryPhase/);

const governancePlane = read("lib/form-ux-migration/form-ux-governance-plane.ts");
assert.match(governancePlane, /getFormUxDecision/);
assert.match(governancePlane, /reconcileGovernanceState/);
assert.match(governancePlane, /resolveGovernanceState/);
assert.match(governancePlane, /getFormUxDecisionInternal/);

const governanceCollapse = read("lib/form-ux-migration/form-ux-governance-collapse-plane.ts");
assert.match(governanceCollapse, /getFormUxGovernanceDecision/);
assert.match(governanceCollapse, /resolveCollapsedGovernanceDecision/);
assert.match(governanceCollapse, /runGovernanceShadowPipeline/);
assert.doesNotMatch(governanceCollapse, /Math\.max/);

const governanceAuthority = read("lib/form-ux-migration/form-ux-governance-authority.ts");
assert.match(governanceAuthority, /getFormUxAuthoritativeDecision/);
assert.match(governanceAuthority, /resolveAuthoritativePhase/);
assert.doesNotMatch(governanceAuthority, /maxPhase/);

const policyEngine = read("lib/form-ux-migration/form-ux-governance-policy-engine.ts");
assert.match(policyEngine, /resolveAuthorityFromPolicy/);
assert.match(policyEngine, /evaluateEnforcementDominance/);
assert.doesNotMatch(policyEngine, /Math\.max/);

const orchestrator = read("lib/form-ux-migration/form-ux-orchestrator.ts");
assert.match(orchestrator, /orchestrateFieldEvaluation/);
assert.match(orchestrator, /atomicRolloutTransaction/);
assert.match(orchestrator, /runGovernanceShadowPipeline/);
assert.match(orchestrator, /resolveConsumerGovernanceView/);
assert.doesNotMatch(orchestrator, /form-ux-governance-authority/);
assert.doesNotMatch(orchestrator, /form-ux-governance-plane/);

const submitRouter = read("lib/form-ux-migration/form-ux-submit-router.ts");
assert.match(submitRouter, /routeFormSubmitPayload/);
assert.match(submitRouter, /resolveFormSubmitPayload/);

assert.match(telemetry, /emitFormUxCrossFormEvent/);
assert.match(telemetry, /crossFormBuffer/);
assert.match(telemetry, /emitFormUxMapVersionEvent/);
assert.match(telemetry, /form_ux_map_version_event/);

exists("lib/form-ux-migration/form-ux-migration-inventory-core.ts");
exists("lib/form-ux-migration/form-ux-migration-classifier.ts");
exists("lib/form-ux-migration/form-ux-migration-queue.ts");
exists("lib/form-ux-migration/form-ux-adoption-report.ts");
exists("lib/form-ux-migration/form-ux-promotion-gates.ts");
exists("lib/form-ux-migration/form-ux-legacy-burndown.ts");
exists("lib/form-ux-migration/form-ux-map-telemetry-store.ts");
exists("lib/form-ux-migration/map-codemod-allowlist.json");
exists("lib/form-ux-migration/form-ux-wave-executor.ts");
exists("lib/form-ux-migration/map-wave-1-impact-report.ts");
exists("lib/form-ux-migration/form-ux-tier0-false-negative-analyzer.ts");
exists("lib/form-ux-migration/form-ux-tier-pattern-miner.ts");
exists("lib/form-ux-migration/form-ux-tier-validation-suite.ts");
exists("lib/form-ux-migration/form-ux-tier-semantic-contract.ts");
exists("lib/form-ux-migration/form-ux-tier-drift-detector.ts");
exists("lib/form-ux-migration/form-ux-tier-lock-registry.ts");
exists("lib/form-ux-migration/form-ux-tier-stability-report.ts");
exists("lib/form-ux-migration/form-ux-tier-stability-test-suite.ts");
exists("lib/form-ux-migration/form-ux-classification-engine.ts");
exists("lib/form-ux-migration/form-ux-migration-eligibility-engine.ts");
exists("lib/form-ux-migration/form-ux-migration-decision-orchestrator.ts");
exists("lib/form-ux-migration/form-ux-wave-exclusion-rules.ts");
exists("lib/form-ux-migration/form-ux-map-versioning.ts");
exists("lib/form-ux-migration/form-ux-map-event-ingestion.ts");
exists("lib/form-ux-migration/form-ux-map-observability-plane.ts");

const mapVersioning = read("lib/form-ux-migration/form-ux-map-versioning.ts");
assert.match(mapVersioning, /MAP_VERSION/);
assert.match(mapVersioning, /resolveCompatibilityStatus/);

const mapEventIngestion = read("lib/form-ux-migration/form-ux-map-event-ingestion.ts");
assert.match(mapEventIngestion, /collectMapObservabilityEvents/);
assert.match(mapEventIngestion, /deduplicateMapEvents/);

const mapObservability = read("lib/form-ux-migration/form-ux-map-observability-plane.ts");
assert.match(mapObservability, /buildMapObservabilitySnapshot/);
assert.match(mapObservability, /formatMapObservabilityReport/);
assert.match(mapObservability, /generateMapObservabilityInsights/);

const mapClassifier = read("lib/form-ux-migration/form-ux-migration-classifier.ts");
assert.match(mapClassifier, /MigrationRiskProfile/);
assert.match(mapClassifier, /classifyMigrationField/);
assert.doesNotMatch(mapClassifier, /applyTier0BStabilization/);
assert.doesNotMatch(mapClassifier, /tier0bStabilityScore/);

const classificationEngine = read("lib/form-ux-migration/form-ux-classification-engine.ts");
assert.match(classificationEngine, /classifyFormUxField/);
assert.match(classificationEngine, /FormUxClassificationResult/);

const eligibilityEngine = read("lib/form-ux-migration/form-ux-migration-eligibility-engine.ts");
assert.match(eligibilityEngine, /evaluateMigrationEligibility/);

const decisionOrchestrator = read("lib/form-ux-migration/form-ux-migration-decision-orchestrator.ts");
assert.match(decisionOrchestrator, /resolveFormUxMigrationDecision/);

const mapQueue = read("lib/form-ux-migration/form-ux-migration-queue.ts");
assert.match(mapQueue, /buildMigrationWaves/);

const mapGates = read("lib/form-ux-migration/form-ux-promotion-gates.ts");
assert.match(mapGates, /evaluatePromotion/);
assert.match(mapGates, /generateRolloutConfigPatch/);

const mapReport = read("lib/form-ux-migration/form-ux-adoption-report.ts");
assert.match(mapReport, /buildAdoptionReport/);
assert.match(mapReport, /computeMapSuccessMetrics/);

const waveExecutor = read("lib/form-ux-migration/form-ux-wave-executor.ts");
assert.match(waveExecutor, /buildWaveExecutionPlan/);
assert.match(waveExecutor, /simulatePromotionPath/);
assert.doesNotMatch(waveExecutor, /rollout-state-machine/);

const waveImpact = read("lib/form-ux-migration/map-wave-1-impact-report.ts");
assert.match(waveImpact, /buildWaveImpactReport/);

console.log("form-ux-migration-coverage.test.ts OK");
