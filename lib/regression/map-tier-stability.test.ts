/**
 * MAP tier stability — lock bypass, eligibility gate, wave decision, determinism.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { classifyFormUxField } from "@/lib/form-ux-migration/form-ux-classification-engine";
import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import { evaluateMigrationEligibility } from "@/lib/form-ux-migration/form-ux-migration-eligibility-engine";
import { resolveFormUxMigrationDecisionForField } from "@/lib/form-ux-migration/form-ux-migration-decision-orchestrator";
import {
  lockTier0BField,
  unlockTier0BField,
} from "@/lib/form-ux-migration/form-ux-tier-lock-registry";
import { runTierStabilityChecks } from "@/lib/form-ux-migration/form-ux-tier-stability-test-suite";
import {
  buildWaveExecutionPlan,
  passesTier0BWaveStabilityGate,
} from "@/lib/form-ux-migration/form-ux-wave-executor";

function field(partial: Partial<MigrationInventoryField> & Pick<MigrationInventoryField, "fieldKey" | "fieldId">): MigrationInventoryField {
  return {
    formId: "settings",
    file: "components/gestionale/settings/general-form.tsx",
    line: 10,
    kind: "text",
    snippet: '<input type="text" onChange={setLabel} required />',
    status: "legacy",
    staticallyMigrated: false,
    source: "scan",
    ...partial,
  };
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "map-stability-"));
const stabilityDir = path.join(tmpRoot, "map", "stability");
fs.mkdirSync(path.join(tmpRoot, "map", "telemetry"), { recursive: true });
fs.mkdirSync(stabilityDir, { recursive: true });
fs.writeFileSync(
  path.join(stabilityDir, "tier-lock-approved.json"),
  JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), locks: [] }),
  "utf8",
);

const controlled = field({ fieldKey: "settings.label", fieldId: "label" });
const classification = classifyFormUxField(controlled, { root: tmpRoot });
assert.equal(classification.tierBand, "0B");

const eligibility = evaluateMigrationEligibility(controlled, classification, { root: tmpRoot });
assert.ok(eligibility.tier0bStabilityScore >= 0);

lockTier0BField("settings.label", { root: tmpRoot, reason: "test lock" });
const lockedEligibility = evaluateMigrationEligibility(controlled, classification, { root: tmpRoot });
assert.equal(lockedEligibility.isLocked, true);
assert.equal(classification.tierBand, "0B");
unlockTier0BField("settings.label", { root: tmpRoot });

const contractFailField = field({
  fieldKey: "settings.ext",
  fieldId: "ext",
  snippet: '<input onChange={setX} /> const v = useStore(s => s.x)',
});
const contractClassification = classifyFormUxField(contractFailField, { root: tmpRoot });
assert.equal(contractClassification.tierBand, "0B");
const contractEligibility = evaluateMigrationEligibility(
  contractFailField,
  contractClassification,
  { root: tmpRoot },
);
assert.equal(contractEligibility.waveEligible, false);

const lowStabilityEligibility = {
  isLocked: false,
  waveStabilityPassed: false,
};
assert.equal(passesTier0BWaveStabilityGate(lowStabilityEligibility, "0B"), false);

const highStabilityEligibility = {
  isLocked: false,
  waveStabilityPassed: true,
};
assert.equal(passesTier0BWaveStabilityGate(highStabilityEligibility, "0B"), true);

const decision = resolveFormUxMigrationDecisionForField(controlled, { root: tmpRoot });
assert.ok(["INCLUDE", "EXCLUDE", "HOLD"].includes(decision.finalDecision));

const checks = runTierStabilityChecks({
  root: process.cwd(),
  fixtureFields: [controlled],
});
assert.ok(checks.checks.length >= 5);

const plan = buildWaveExecutionPlan(1);
assert.ok(Array.isArray(plan.driftAdjustedCandidates));

fs.rmSync(tmpRoot, { recursive: true, force: true });

console.log("map-tier-stability.test.ts OK");
