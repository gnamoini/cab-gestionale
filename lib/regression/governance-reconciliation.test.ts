/**
 * UGP — reconcile throttle 10s, no double reconcile, autoReconciled flag.
 */
import assert from "node:assert/strict";
import {
  reconcileGovernanceState,
  resetFormUxGovernancePlane,
  setFormUxGovernanceAxisForTests,
} from "@/lib/form-ux-migration/form-ux-governance-plane";
import {
  clearFormUxMigrationEvents,
  getFormUxGovernanceDriftEvents,
} from "@/lib/form-ux-migration/telemetry";

function resetAll(): void {
  resetFormUxGovernancePlane();
  setFormUxGovernanceAxisForTests({});
  clearFormUxMigrationEvents();
}

resetAll();

setFormUxGovernanceAxisForTests({ platform: 1, boundary: 2 });

const first = reconcileGovernanceState("ricambio");
assert.equal(first.driftDetected, true);
assert.ok(first.lastReconciliationAt > 0);

const eventsAfterFirst = getFormUxGovernanceDriftEvents().length;
assert.equal(
  getFormUxGovernanceDriftEvents()[eventsAfterFirst - 1]?.autoReconciled,
  true,
);

reconcileGovernanceState("ricambio");
const eventsAfterSecond = getFormUxGovernanceDriftEvents().length;
assert.equal(eventsAfterSecond, eventsAfterFirst + 1);
assert.equal(
  getFormUxGovernanceDriftEvents()[eventsAfterSecond - 1]?.autoReconciled,
  false,
);

const globalFirst = reconcileGovernanceState();
assert.equal(globalFirst.driftDetected, true);
const globalSecond = reconcileGovernanceState();
assert.equal(globalSecond.lastReconciliationAt, globalFirst.lastReconciliationAt);

resetAll();
console.log("governance-reconciliation.test.ts OK");
