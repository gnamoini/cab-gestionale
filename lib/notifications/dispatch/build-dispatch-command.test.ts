import assert from "node:assert/strict";
import { buildDispatchCommandFromLegacy } from "@/lib/notifications/dispatch/build-dispatch-command.server";
import { buildAdminDashboardTestNotification } from "@/lib/notifications/admin-dashboard-notifications";

const actorId = "00000000-0000-4000-8000-000000000001";
const legacy = buildAdminDashboardTestNotification();
const build = buildDispatchCommandFromLegacy("system.dashboard_test", actorId, legacy);

const cmdA = build!("00000000-0000-4000-8000-000000000002");
const cmdB = build!("00000000-0000-4000-8000-000000000003");

assert.ok(cmdA);
assert.ok(cmdB);
assert.notEqual(cmdA.dedupKey, cmdB.dedupKey);
assert.notEqual(cmdA.idempotencyKey, cmdB.idempotencyKey);
assert.ok(cmdA.scope);
assert.equal(cmdA.scope.type, "user");
assert.ok(cmdA.scope.type === "user");
assert.equal(cmdA.scope.value, "00000000-0000-4000-8000-000000000002");
assert.equal(cmdA.actorId, actorId);

console.log("build-dispatch-command.test.ts OK");
