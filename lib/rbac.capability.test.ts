import assert from "node:assert/strict";
import { hasCapability } from "@/lib/rbac";

assert.equal(hasCapability({ ruolo: "operatore" }, "can_manage_settings"), false);
assert.equal(hasCapability({ ruolo: "manager" }, "can_manage_settings"), true);
assert.equal(
  hasCapability({ ruolo: "operatore" }, "can_manage_settings", { operatorGlobalSettingsDbEnabled: false }),
  false,
);
assert.equal(hasCapability({ ruolo: "guest" }, "can_manage_settings"), false);
assert.equal(hasCapability({ ruolo: "guest" }, "can_read_operational"), true);
assert.equal(hasCapability({ ruolo: "guest" }, "can_write_operational"), false);

console.log("rbac.capability.test.ts OK");
