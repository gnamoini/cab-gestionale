/**
 * SGCL — same inputs → same collapsed decision.
 */
import assert from "node:assert/strict";
import {
  getFormUxGovernanceDecision,
  resetFormUxGovernanceCollapsePlane,
} from "@/lib/form-ux-migration/form-ux-governance-collapse-plane";
import {
  resetFormUxGovernancePlane,
  setFormUxGovernanceAxisForTests,
} from "@/lib/form-ux-migration/form-ux-governance-plane";

function resetAll(): void {
  resetFormUxGovernanceCollapsePlane();
  resetFormUxGovernancePlane();
  setFormUxGovernanceAxisForTests({});
}

resetAll();

setFormUxGovernanceAxisForTests({ platform: 2, boundary: 3 });
const first = getFormUxGovernanceDecision("ricambio");
const second = getFormUxGovernanceDecision("ricambio");
assert.deepEqual(first, second);

resetFormUxGovernancePlane();
setFormUxGovernanceAxisForTests({ platform: 3, boundary: 2 });
const third = getFormUxGovernanceDecision("lavorazioni");
const fourth = getFormUxGovernanceDecision("lavorazioni");
assert.deepEqual(third, fourth);
assert.equal(third.phase, 1);

resetAll();
console.log("collapse-determinism.test.ts OK");
