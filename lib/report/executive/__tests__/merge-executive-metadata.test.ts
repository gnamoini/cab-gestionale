import assert from "node:assert/strict";
import { mergeTrustStatus } from "@/lib/report/executive/merge-executive-metadata";

assert.equal(mergeTrustStatus(["GREEN", "AMBER"]), "AMBER");
assert.equal(mergeTrustStatus(["GREEN", "RED"]), "RED");
assert.equal(mergeTrustStatus(["AMBER", "AMBER"]), "AMBER");
assert.equal(mergeTrustStatus(["GREEN", "GREEN"]), "GREEN");

console.log("merge-executive-metadata.test.ts OK");
