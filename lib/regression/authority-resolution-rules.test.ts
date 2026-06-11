/**
 * GAML — R1–R4 policy matrix.
 */
import assert from "node:assert/strict";
import {
  resolveAuthoritativePhase,
  resetFormUxGovernanceAuthority,
} from "@/lib/form-ux-migration/form-ux-governance-authority";
import {
  resetFormUxGovernancePlane,
  setFormUxGovernanceAxisForTests,
} from "@/lib/form-ux-migration/form-ux-governance-plane";
import { clearFormUxMigrationEvents } from "@/lib/form-ux-migration/telemetry";

function resetAll(): void {
  resetFormUxGovernanceAuthority();
  resetFormUxGovernancePlane();
  setFormUxGovernanceAxisForTests({});
  clearFormUxMigrationEvents();
}

resetAll();

setFormUxGovernanceAxisForTests({ platform: 2, boundary: 4 });
const r1 = resolveAuthoritativePhase("ricambio");
assert.equal(r1.appliedRule, "R1");
assert.equal(r1.phase, 4);
assert.equal(r1.authoritySource, "boundary");

resetFormUxGovernancePlane();
setFormUxGovernanceAxisForTests({ platform: 3, boundary: 2 });
const r2 = resolveAuthoritativePhase("lavorazioni");
assert.equal(r2.appliedRule, "R2");
assert.equal(r2.phase, 1);
assert.equal(r2.authoritySource, "registry");

resetFormUxGovernancePlane();
setFormUxGovernanceAxisForTests({ platform: 1, boundary: 2 });
const r3 = resolveAuthoritativePhase("ricambio");
assert.equal(r3.appliedRule, "R3");
assert.equal(r3.phase, 2);
assert.equal(r3.authoritySource, "boundary");

resetFormUxGovernancePlane();
setFormUxGovernanceAxisForTests({ platform: 2, boundary: 2 });
const r4 = resolveAuthoritativePhase("ricambio");
assert.equal(r4.appliedRule, "R4");
assert.equal(r4.phase, 2);
assert.equal(r4.authoritySource, "platform");

resetAll();
console.log("authority-resolution-rules.test.ts OK");
