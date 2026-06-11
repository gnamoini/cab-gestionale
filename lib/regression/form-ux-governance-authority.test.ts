/**
 * GAML — API surface, authoritySource, adoption phase default.
 */
import assert from "node:assert/strict";
import {
  getFormUxAuthoritativeDecision,
  getFormUxAuthorityAdoptionPhase,
  resetFormUxGovernanceAuthority,
  resolveAuthoritativePhase,
  setFormUxAuthorityAdoptionPhaseForTests,
} from "@/lib/form-ux-migration/form-ux-governance-authority";
import {
  resetFormUxGovernancePlane,
  setFormUxGovernanceAxisForTests,
} from "@/lib/form-ux-migration/form-ux-governance-plane";
import { clearFormUxMigrationEvents } from "@/lib/form-ux-migration/telemetry";

function resetAll(): void {
  resetFormUxGovernanceAuthority();
  resetFormUxGovernancePlane();
  setFormUxAuthorityAdoptionPhaseForTests(null);
  setFormUxGovernanceAxisForTests({});
  clearFormUxMigrationEvents();
}

resetAll();

assert.equal(getFormUxAuthorityAdoptionPhase(), 2);

setFormUxGovernanceAxisForTests({ platform: 1, boundary: 2 });
const resolution = resolveAuthoritativePhase("ricambio");
assert.equal(resolution.phase, 2);
assert.equal(resolution.authoritySource, "boundary");
assert.equal(resolution.appliedRule, "R3");

const decision = getFormUxAuthoritativeDecision("ricambio");
assert.equal(decision.phase, 2);
assert.equal(decision.authoritySource, "boundary");
assert.equal(decision.routing, "orchestrator");
assert.equal(decision.blocked, false);

resetAll();
console.log("form-ux-governance-authority.test.ts OK");
