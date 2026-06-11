/**
 * GAML — Authority vs UGP divergence telemetry.
 */
import assert from "node:assert/strict";
import {
  getFormUxAuthoritativeDecision,
  resetFormUxGovernanceAuthority,
  runAuthorityShadowEvaluation,
} from "@/lib/form-ux-migration/form-ux-governance-authority";
import {
  resetFormUxGovernancePlane,
  resolveGovernanceState,
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

setFormUxGovernanceAxisForTests({ platform: 1, boundary: 2 });

const ugp = resolveGovernanceState("ricambio");
assert.equal(ugp.resolvedPhase, 3);

const authority = getFormUxAuthoritativeDecision("ricambio");
assert.equal(authority.phase, 2);
assert.equal(authority.authoritySource, "boundary");

clearFormUxMigrationEvents();
runAuthorityShadowEvaluation("ricambio");

const violations = getFormUxGovernanceAuthorityViolationEvents();
assert.ok(violations.length >= 1);
const divergence = violations.find((e) => e.violationType === "authority_ugp_divergence");
assert.ok(divergence);
assert.equal(divergence?.ugpPhase, 3);
assert.equal(divergence?.authorityPhase, 2);
assert.equal(divergence?.severity, "warn");

resetAll();
console.log("authority-vs-ugp-drift.test.ts OK");
