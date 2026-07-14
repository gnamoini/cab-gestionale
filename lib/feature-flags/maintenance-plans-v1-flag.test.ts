import assert from "node:assert/strict";
import { isMaintenancePlansV1Enabled } from "@/lib/officina/maintenance-plans-v1-flag";

const prev = process.env.NEXT_PUBLIC_MAINTENANCE_PLANS_V1;
try {
  delete process.env.NEXT_PUBLIC_MAINTENANCE_PLANS_V1;
  assert.equal(isMaintenancePlansV1Enabled(), true);

  process.env.NEXT_PUBLIC_MAINTENANCE_PLANS_V1 = "0";
  assert.equal(isMaintenancePlansV1Enabled(), false);
} finally {
  if (prev === undefined) delete process.env.NEXT_PUBLIC_MAINTENANCE_PLANS_V1;
  else process.env.NEXT_PUBLIC_MAINTENANCE_PLANS_V1 = prev;
}

console.log("maintenance-plans-v1-flag.test.ts OK");
