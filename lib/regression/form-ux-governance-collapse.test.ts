/**
 * SGCL — API surface, default adoption 2, collapsed flag.
 */
import assert from "node:assert/strict";
import {
  getFormUxCollapseAdoptionPhase,
  getFormUxGovernanceDecision,
  resetFormUxGovernanceCollapsePlane,
  setFormUxCollapseAdoptionPhaseForTests,
} from "@/lib/form-ux-migration/form-ux-governance-collapse-plane";
import {
  resetFormUxGovernancePlane,
  setFormUxGovernanceAxisForTests,
} from "@/lib/form-ux-migration/form-ux-governance-plane";
import { clearFormUxMigrationEvents } from "@/lib/form-ux-migration/telemetry";

function resetAll(): void {
  resetFormUxGovernanceCollapsePlane();
  resetFormUxGovernancePlane();
  setFormUxCollapseAdoptionPhaseForTests(null);
  setFormUxGovernanceAxisForTests({});
  clearFormUxMigrationEvents();
}

resetAll();

assert.equal(getFormUxCollapseAdoptionPhase(), 2);

setFormUxGovernanceAxisForTests({ platform: 1, boundary: 2 });
const decision = getFormUxGovernanceDecision("ricambio");
assert.equal(decision.collapsed, true);
assert.equal(decision.authoritySource, "gaml");
assert.equal(decision.phase, 2);
assert.equal(decision.routing, "orchestrator");

resetAll();
console.log("form-ux-governance-collapse.test.ts OK");
