/**
 * MAP — modules must not import frozen governance / rollout runtime layers.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "lib/form-ux-migration");

const MAP_MODULES = [
  "form-ux-migration-inventory-core.ts",
  "form-ux-migration-classifier.ts",
  "form-ux-migration-queue.ts",
  "form-ux-adoption-report.ts",
  "form-ux-promotion-gates.ts",
  "form-ux-legacy-burndown.ts",
  "form-ux-map-telemetry-store.ts",
  "form-ux-wave-executor.ts",
  "map-wave-1-impact-report.ts",
  "form-ux-tier0-false-negative-analyzer.ts",
  "form-ux-tier-pattern-miner.ts",
  "form-ux-tier-validation-suite.ts",
  "form-ux-tier-semantic-contract.ts",
  "form-ux-tier-drift-detector.ts",
  "form-ux-tier-lock-registry.ts",
  "form-ux-tier-stability-report.ts",
  "form-ux-tier-stability-test-suite.ts",
  "form-ux-classification-engine.ts",
  "form-ux-migration-eligibility-engine.ts",
  "form-ux-migration-decision-orchestrator.ts",
  "form-ux-wave-exclusion-rules.ts",
  "form-ux-map-versioning.ts",
  "form-ux-map-event-ingestion.ts",
  "form-ux-map-observability-plane.ts",
] as const;

const FORBIDDEN_IMPORTS = [
  "form-ux-governance-collapse-router",
  "form-ux-governance-collapse-plane",
  "form-ux-governance-authority",
  "form-ux-governance-plane",
  "atomic-rollout-transaction",
  "form-ux-boundary-gate",
  "rollout-state-machine",
  "rollout-controller",
] as const;

for (const file of MAP_MODULES) {
  const src = fs.readFileSync(path.join(ROOT, file), "utf8");
  for (const forbidden of FORBIDDEN_IMPORTS) {
    assert.doesNotMatch(
      src,
      new RegExp(forbidden.replace(/\//g, "\\/")),
      `${file} must not import ${forbidden}`,
    );
  }
}

console.log("map-consumer-isolation.test.ts OK");
