/**
 * SGCL — collapse >= 3 GAML-only; fallback emits collapse event, no mixed fields.
 */
import assert from "node:assert/strict";
import {
  getFormUxGovernanceDecision,
  resetFormUxGovernanceCollapsePlane,
  resolveCollapsedGovernanceDecision,
  setFormUxCollapseAdoptionPhaseForTests,
  setGamlRuntimeAvailableForTests,
} from "@/lib/form-ux-migration/form-ux-governance-collapse-plane";
import {
  resetFormUxGovernancePlane,
  setFormUxGovernanceAxisForTests,
} from "@/lib/form-ux-migration/form-ux-governance-plane";
import {
  clearFormUxMigrationEvents,
  getFormUxGovernanceCollapseEvents,
} from "@/lib/form-ux-migration/telemetry";

function resetAll(): void {
  resetFormUxGovernanceCollapsePlane();
  resetFormUxGovernancePlane();
  setFormUxCollapseAdoptionPhaseForTests(null);
  setGamlRuntimeAvailableForTests(null);
  setFormUxGovernanceAxisForTests({});
  clearFormUxMigrationEvents();
}

resetAll();

setFormUxCollapseAdoptionPhaseForTests(3);
setFormUxGovernanceAxisForTests({ platform: 1, boundary: 2 });

const active = resolveCollapsedGovernanceDecision("ricambio");
assert.equal(active.source, "gaml");
assert.equal(active.collapseMode, "active");
assert.equal(active.decision.authoritySource, "gaml");
assert.equal(active.decision.collapsed, true);

const decision = getFormUxGovernanceDecision("ricambio");
assert.equal(decision.authoritySource, "gaml");
assert.equal(decision.phase, active.decision.phase);
assert.equal(decision.routing, active.decision.routing);

clearFormUxMigrationEvents();
setGamlRuntimeAvailableForTests(false);
const fallback = resolveCollapsedGovernanceDecision("ricambio");
assert.equal(fallback.source, "ugp");
assert.equal(fallback.collapseMode, "fallback");
assert.equal(fallback.decision.authoritySource, "gaml");

const fallbackEvents = getFormUxGovernanceCollapseEvents().filter(
  (e) => e.collapseMode === "fallback",
);
assert.ok(fallbackEvents.length >= 1);

resetAll();
console.log("gaml-single-source-enforcement.test.ts OK");
