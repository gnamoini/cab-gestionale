/**
 * SGCL Phase 3 — router cache, GAML path, routing latency telemetry.
 */
import assert from "node:assert/strict";
import {
  getFormUxGovernanceDecision,
  resetFormUxGovernanceCollapsePlane,
  setFormUxCollapseAdoptionPhaseForTests,
} from "@/lib/form-ux-migration/form-ux-governance-collapse-plane";
import {
  invalidateSgclCache,
  routeGovernanceDecision,
  resetSgclRouterCache,
} from "@/lib/form-ux-migration/form-ux-governance-collapse-router";
import {
  resetFormUxGovernancePlane,
  setFormUxGovernanceAxisForTests,
} from "@/lib/form-ux-migration/form-ux-governance-plane";
import {
  clearFormUxMigrationEvents,
  getFormUxSgclRoutingEvents,
} from "@/lib/form-ux-migration/telemetry";

function resetAll(): void {
  resetFormUxGovernanceCollapsePlane();
  resetSgclRouterCache();
  resetFormUxGovernancePlane();
  setFormUxCollapseAdoptionPhaseForTests(null);
  setFormUxGovernanceAxisForTests({});
  clearFormUxMigrationEvents();
}

resetAll();

setFormUxCollapseAdoptionPhaseForTests(3);
setFormUxGovernanceAxisForTests({ platform: 1, boundary: 2 });

clearFormUxMigrationEvents();
const miss = routeGovernanceDecision("ricambio");
assert.equal(miss.resolvedSource, "gaml");
assert.ok(miss.routingLatencyMs >= 0);
assert.equal(miss.decision.phase, 2);

const routingEvents = getFormUxSgclRoutingEvents();
assert.ok(routingEvents.length >= 1);
assert.equal(routingEvents[routingEvents.length - 1]!.resolvedSource, "gaml");

const hit = routeGovernanceDecision("ricambio");
assert.equal(hit.resolvedSource, "sgcl-cache");
assert.deepEqual(hit.decision, miss.decision);

invalidateSgclCache("ricambio");
const afterInvalidate = routeGovernanceDecision("ricambio");
assert.equal(afterInvalidate.resolvedSource, "gaml");

const viaFacade = getFormUxGovernanceDecision("ricambio");
assert.deepEqual(viaFacade, afterInvalidate.decision);

resetAll();
console.log("sgcl-phase3-routing.test.ts OK");
