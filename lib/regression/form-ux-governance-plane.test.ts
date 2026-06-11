/**
 * UGP — resolveGovernanceState, max precedence, derive registryPhase.
 */
import assert from "node:assert/strict";
import { deriveRegistryPhase } from "@/lib/form-ux-migration/form-ux-registry";
import {
  getFormUxGovernanceAdoptionPhase,
  readBoundaryPhaseInput,
  readPlatformPhaseInput,
  resetFormUxGovernancePlane,
  resolveGovernanceState,
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
assert.equal(readPlatformPhaseInput(), 1);
assert.equal(readBoundaryPhaseInput(), 2);

setFormUxGovernanceAxisForTests({ platform: 1, boundary: 2 });
const drifted = resolveGovernanceState("ricambio");
assert.equal(drifted.platformPhase, 1);
assert.equal(drifted.boundaryPhase, 2);
assert.equal(drifted.registryPhase, 3);
assert.equal(drifted.resolvedPhase, 3);
assert.equal(drifted.driftDetected, true);

setFormUxGovernanceAxisForTests({ platform: 3, boundary: 3 });
const aligned = resolveGovernanceState("ricambio");
assert.equal(aligned.resolvedPhase, 3);
assert.equal(aligned.driftDetected, false);

assert.equal(deriveRegistryPhase("lavorazioni"), 1);
assert.equal(deriveRegistryPhase("ricambio"), 3);

setFormUxGovernanceAxisForTests({ platform: 1, boundary: 2 });
const noForm = resolveGovernanceState();
assert.equal(noForm.registryPhase, 1);
assert.equal(noForm.resolvedPhase, 2);

resetAll();
console.log("form-ux-governance-plane.test.ts OK");
