/**
 * SGCL Phase 3 — collapse=3 routes exclusively through getFormUxGovernanceDecision.
 */
import assert from "node:assert/strict";
import {
  getFormUxGovernanceDecision,
  resetFormUxGovernanceCollapsePlane,
  resolveConsumerGovernanceView,
  setFormUxCollapseAdoptionPhaseForTests,
} from "@/lib/form-ux-migration/form-ux-governance-collapse-plane";
import {
  resetFormUxGovernancePlane,
  setFormUxGovernanceAxisForTests,
} from "@/lib/form-ux-migration/form-ux-governance-plane";

function resetAll(): void {
  resetFormUxGovernanceCollapsePlane();
  resetFormUxGovernancePlane();
  setFormUxCollapseAdoptionPhaseForTests(null);
  setFormUxGovernanceAxisForTests({});
}

resetAll();

setFormUxCollapseAdoptionPhaseForTests(3);
setFormUxGovernanceAxisForTests({ platform: 2, boundary: 2 });

const first = getFormUxGovernanceDecision("ricambio");
const second = getFormUxGovernanceDecision("ricambio");
assert.deepEqual(first, second);

const view = resolveConsumerGovernanceView("ricambio");
assert.equal(view.phase, first.phase);
assert.equal(view.mode, first.mode);
assert.equal(view.routing, first.routing);
assert.equal(view.blocked, first.blocked);

const lavorazioni = getFormUxGovernanceDecision("lavorazioni");
const lavorazioniRepeat = getFormUxGovernanceDecision("lavorazioni");
assert.deepEqual(lavorazioni, lavorazioniRepeat);

resetAll();
console.log("sgcl-single-entrypoint.test.ts OK");
