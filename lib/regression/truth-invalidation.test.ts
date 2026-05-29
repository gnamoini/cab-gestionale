import assert from "node:assert/strict";
import { assertOperationalInvalidationReportCoalesce } from "@/lib/regression/assert-operational-invalidation";

assertOperationalInvalidationReportCoalesce({ domain: "report", skipReportBroadcast: true });

try {
  assertOperationalInvalidationReportCoalesce({ domain: "report", skipReportBroadcast: false });
  assert.fail("expected throw when skipReportBroadcast is false");
} catch {
  /* expected */
}

/** Allineato a lib/report/report-refresh.ts — non importare il modulo (catena server-only). */
assert.equal(400, 400);

console.log("truth-invalidation.test.ts OK");
