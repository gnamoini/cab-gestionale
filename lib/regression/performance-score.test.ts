import assert from "node:assert/strict";
import { computePerformanceScore } from "@/lib/performance/performance-score";

const score = computePerformanceScore({
  build: { firstLoadJsKb: 1793, vendorChunkKb: 443 },
  snapshot: {
    routes: [{ route: "/lavorazioni", payloadKb: 7, budget: { maxPayloadKb: 12 } }],
    cacheHitRatio: 0.9,
  },
  policyPass: true,
});

assert.ok(score.total >= 80 && score.total <= 100);
assert.equal(score.policy, 100);

console.log("performance-score.test.ts OK");
