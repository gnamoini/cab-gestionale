import assert from "node:assert/strict";
import { isStaffAdminRole } from "@/lib/notifications/staff-admin";

assert.ok(isStaffAdminRole("admin"));
assert.ok(isStaffAdminRole("manager"));
assert.ok(!isStaffAdminRole("operatore"));
assert.ok(!isStaffAdminRole("guest"));

console.log("staff-admin.test.ts OK");
