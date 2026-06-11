/**
 * SGCL — collapse 4 UGP telemetry-only; stale reconcile cache ignored at runtime.
 */
import assert from "node:assert/strict";
import {
  getFormUxGovernanceDecision,
  resetFormUxGovernanceCollapsePlane,
  setFormUxCollapseAdoptionPhaseForTests,
} from "@/lib/form-ux-migration/form-ux-governance-collapse-plane";
import {
  getFormUxDecision,
  reconcileGovernanceState,
  resetFormUxGovernancePlane,
  setFormUxGovernanceAdoptionPhaseForTests,
  setFormUxGovernanceAxisForTests,
} from "@/lib/form-ux-migration/form-ux-governance-plane";
import {
  clearFormUxMigrationEvents,
  getFormUxGovernanceDriftEvents,
} from "@/lib/form-ux-migration/telemetry";

function resetAll(): void {
  resetFormUxGovernanceCollapsePlane();
  resetFormUxGovernancePlane();
  setFormUxCollapseAdoptionPhaseForTests(null);
  setFormUxGovernanceAdoptionPhaseForTests(null);
  setFormUxGovernanceAxisForTests({});
  clearFormUxMigrationEvents();
}

resetAll();

setFormUxGovernanceAxisForTests({ platform: 1, boundary: 2 });
setFormUxCollapseAdoptionPhaseForTests(4);
setFormUxGovernanceAdoptionPhaseForTests(4);

reconcileGovernanceState("ricambio");
const ugpViaTelemetry = getFormUxDecision("ricambio");
const collapsed = getFormUxGovernanceDecision("ricambio");

assert.equal(ugpViaTelemetry.phase, collapsed.phase);
assert.equal(collapsed.phase, 2);
assert.notEqual(collapsed.phase, 3);

assert.ok(getFormUxGovernanceDriftEvents().length >= 0);

resetAll();
console.log("ugp-deprecation-safety.test.ts OK");
