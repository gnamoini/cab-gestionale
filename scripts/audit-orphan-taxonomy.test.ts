import assert from "node:assert/strict";
import { scoreConfidence, confidenceLabel } from "../scripts/audit-orphan-taxonomy";

const high = scoreConfidence({
  knipUnused: true,
  importInboundZero: true,
  grepZero: true,
  runtimeEdgeZero: true,
  dynamicRisk: false,
  registryAdjacent: false,
});
assert.equal(high.score, 90);
assert.equal(confidenceLabel(high.score), "high");
assert.deepEqual(high.evidence, [
  "knip:file-unused",
  "importGraph:0-inbound",
  "grep:no-reference",
  "runtimeEdges:0",
]);

const low = scoreConfidence({
  knipUnused: true,
  importInboundZero: true,
  grepZero: false,
  runtimeEdgeZero: true,
  dynamicRisk: true,
  registryAdjacent: true,
});
assert.ok(low.score < 50);
assert.equal(confidenceLabel(low.score), "low");

console.log("audit-orphan-taxonomy.test.ts OK");
