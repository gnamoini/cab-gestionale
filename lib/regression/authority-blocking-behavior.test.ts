/**
 * GAML — blocked=true, boundary phase 4 unregistered.
 */
import assert from "node:assert/strict";
import {
  getFormUxAuthoritativeDecision,
  resetFormUxGovernanceAuthority,
} from "@/lib/form-ux-migration/form-ux-governance-authority";
import {
  resetFormUxGovernancePlane,
  setFormUxGovernanceAxisForTests,
} from "@/lib/form-ux-migration/form-ux-governance-plane";
import {
  clearFormUxMigrationEvents,
  getFormUxGovernanceAuthorityViolationEvents,
} from "@/lib/form-ux-migration/telemetry";

function resetAll(): void {
  resetFormUxGovernanceAuthority();
  resetFormUxGovernancePlane();
  setFormUxGovernanceAxisForTests({});
  clearFormUxMigrationEvents();
}

resetAll();

setFormUxGovernanceAxisForTests({ platform: 1, boundary: 4 });
const unregistered = getFormUxAuthoritativeDecision("unknown-form" as "ricambio");
assert.equal(unregistered.phase, 4);
assert.equal(unregistered.authoritySource, "boundary");
assert.equal(unregistered.blocked, true);

const blockEvents = getFormUxGovernanceAuthorityViolationEvents().filter(
  (e) => e.violationType === "enforcement_block",
);
assert.ok(blockEvents.length >= 1);

resetFormUxGovernancePlane();
setFormUxGovernanceAxisForTests({ platform: 1, boundary: 4 });
clearFormUxMigrationEvents();
const registered = getFormUxAuthoritativeDecision("ricambio");
assert.equal(registered.phase, 4);
assert.equal(registered.blocked, false);

resetAll();
console.log("authority-blocking-behavior.test.ts OK");
