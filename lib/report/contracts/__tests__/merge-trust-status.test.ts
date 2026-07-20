import assert from "node:assert/strict";
import { mergeTrustStatus } from "@/lib/report/contracts/merge-trust-status";

assert.equal(mergeTrustStatus(["GREEN", "AMBER"]), "AMBER");
assert.equal(mergeTrustStatus(["GREEN", "RED"]), "RED");
assert.equal(mergeTrustStatus(["AMBER", "AMBER"]), "AMBER");
assert.equal(mergeTrustStatus(["GREEN", "GREEN"]), "GREEN");

console.log("merge-trust-status.test.ts OK");
