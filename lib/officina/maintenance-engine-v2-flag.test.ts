import assert from "node:assert/strict";
import {
  maintenanceEngineV2UserBucket,
  parseMaintenanceEngineV2Flags,
  resolveMaintenanceEngineV2Enabled,
} from "@/lib/officina/maintenance-engine-v2-flag";

const flags = parseMaintenanceEngineV2Flags({
  enabled: true,
  percentage: 50,
  allowed_roles: ["admin"],
});
assert.equal(flags.percentage, 50);
assert.deepEqual(flags.allowedRoles, ["admin"]);

assert.equal(
  resolveMaintenanceEngineV2Enabled({
    dbFlags: { enabled: true, percentage: 100, allowedRoles: [] },
    userId: "user-a",
    userRole: "operatore",
  }),
  true,
);

assert.equal(
  resolveMaintenanceEngineV2Enabled({
    dbFlags: { enabled: true, percentage: 100, allowedRoles: ["admin"] },
    userId: "user-a",
    userRole: "operatore",
  }),
  false,
);

const bucket = maintenanceEngineV2UserBucket("stable-user-id");
assert.ok(bucket >= 0 && bucket < 100);

console.log("maintenance-engine-v2-flag.test.ts OK");
