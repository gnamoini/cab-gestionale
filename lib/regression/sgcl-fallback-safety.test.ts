/**
 * SGCL Phase 3 — GAML unavailable → ugp-fallback, single hop, routing event.
 */
import assert from "node:assert/strict";
import {
  resetFormUxGovernanceCollapsePlane,
  setFormUxCollapseAdoptionPhaseForTests,
  setGamlRuntimeAvailableForTests,
} from "@/lib/form-ux-migration/form-ux-governance-collapse-plane";
import {
  resetSgclRouterCache,
  routeGovernanceDecision,
} from "@/lib/form-ux-migration/form-ux-governance-collapse-router";
import {
  resetFormUxGovernancePlane,
  setFormUxGovernanceAxisForTests,
} from "@/lib/form-ux-migration/form-ux-governance-plane";
import {
  clearFormUxMigrationEvents,
  getFormUxGovernanceCollapseEvents,
  getFormUxSgclRoutingEvents,
} from "@/lib/form-ux-migration/telemetry";

function resetAll(): void {
  resetFormUxGovernanceCollapsePlane();
  resetSgclRouterCache();
  resetFormUxGovernancePlane();
  setFormUxCollapseAdoptionPhaseForTests(null);
  setGamlRuntimeAvailableForTests(null);
  setFormUxGovernanceAxisForTests({});
  clearFormUxMigrationEvents();
}

resetAll();

setFormUxCollapseAdoptionPhaseForTests(3);
setFormUxGovernanceAxisForTests({ platform: 1, boundary: 2 });
setGamlRuntimeAvailableForTests(false);

const routed = routeGovernanceDecision("ricambio");
assert.equal(routed.resolvedSource, "ugp-fallback");
assert.equal(routed.fallbackReason, "gaml_unavailable");
assert.equal(routed.decision.collapsed, true);

const cached = routeGovernanceDecision("ricambio");
assert.equal(cached.resolvedSource, "sgcl-cache");

const sgclEvents = getFormUxSgclRoutingEvents().filter((e) => e.formId === "ricambio");
assert.ok(sgclEvents.some((e) => e.resolvedSource === "ugp-fallback"));

const collapseFallback = getFormUxGovernanceCollapseEvents().filter(
  (e) => e.collapseMode === "fallback",
);
assert.ok(collapseFallback.length >= 1);

resetAll();
console.log("sgcl-fallback-safety.test.ts OK");
