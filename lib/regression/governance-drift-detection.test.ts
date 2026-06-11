/**
 * UGP — boundary≠platform, registry≠resolved, drift telemetry.
 */
import assert from "node:assert/strict";
import {
  getFormUxDecision,
  resetFormUxGovernancePlane,
  setFormUxGovernanceAxisForTests,
} from "@/lib/form-ux-migration/form-ux-governance-plane";
import {
  clearFormUxMigrationEvents,
  getFormUxGovernanceDriftEvents,
} from "@/lib/form-ux-migration/telemetry";

function resetAll(): void {
  resetFormUxGovernancePlane();
  setFormUxGovernanceAxisForTests({});
  clearFormUxMigrationEvents();
}

resetAll();

setFormUxGovernanceAxisForTests({ platform: 1, boundary: 2 });
getFormUxDecision("ricambio");

const events = getFormUxGovernanceDriftEvents();
assert.ok(events.length >= 1);
const last = events[events.length - 1]!;
assert.equal(last.formId, "ricambio");
assert.equal(last.platformPhase, 1);
assert.equal(last.boundaryPhase, 2);
assert.equal(last.registryPhase, 3);
assert.equal(last.resolvedPhase, 3);
assert.ok(
  last.driftType === "registry_resolved" || last.driftType === "multi_axis",
);
assert.equal(last.autoReconciled, true);

setFormUxGovernanceAxisForTests({ platform: 3, boundary: 3 });
clearFormUxMigrationEvents();
resetFormUxGovernancePlane();
setFormUxGovernanceAxisForTests({ platform: 3, boundary: 3 });
getFormUxDecision("ricambio");
const aligned = getFormUxGovernanceDriftEvents();
assert.equal(aligned.length, 0);

resetAll();
console.log("governance-drift-detection.test.ts OK");
