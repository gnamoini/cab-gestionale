/**
 * UGP — getFormUxDecision ricambio pilot; routing/mode/enforcement mapping.
 */
import assert from "node:assert/strict";
import {
  getFormUxDecision,
  getFormUxGovernanceAdoptionPhase,
  resetFormUxGovernancePlane,
  setFormUxGovernanceAdoptionPhaseForTests,
  setFormUxGovernanceAxisForTests,
} from "@/lib/form-ux-migration/form-ux-governance-plane";

function resetAll(): void {
  resetFormUxGovernancePlane();
  setFormUxGovernanceAdoptionPhaseForTests(null);
  setFormUxGovernanceAxisForTests({});
}

resetAll();

assert.equal(getFormUxGovernanceAdoptionPhase(), 2);

setFormUxGovernanceAxisForTests({ platform: 1, boundary: 1 });
const legacyForm = getFormUxDecision("lavorazioni");
assert.equal(legacyForm.routing, "legacy");
assert.equal(legacyForm.mode, "legacy");
assert.equal(legacyForm.enforcement, "off");

setFormUxGovernanceAxisForTests({ platform: 2, boundary: 2 });
const ricambioShadow = getFormUxDecision("ricambio");
assert.equal(ricambioShadow.routing, "orchestrator");
assert.ok(["shadow", "enforced"].includes(ricambioShadow.mode));
assert.ok(["off", "warn", "soft", "hard"].includes(ricambioShadow.enforcement));

setFormUxGovernanceAxisForTests({ platform: 3, boundary: 3 });
const ricambioEnforced = getFormUxDecision("ricambio");
assert.equal(ricambioEnforced.phase, 3);
assert.equal(ricambioEnforced.routing, "orchestrator");
assert.equal(ricambioEnforced.mode, "enforced");

setFormUxGovernanceAdoptionPhaseForTests(3);
setFormUxGovernanceAxisForTests({ platform: 1, boundary: 2 });
resetFormUxGovernancePlane();
setFormUxGovernanceAdoptionPhaseForTests(3);
setFormUxGovernanceAxisForTests({ platform: 1, boundary: 2 });
const adopted = getFormUxDecision("ricambio");
assert.equal(adopted.phase, 3);

resetAll();
console.log("single-decision-api.test.ts OK");
