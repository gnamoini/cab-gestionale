import assert from "node:assert/strict";
import { hasCapability } from "@/lib/rbac";

assert.equal(hasCapability({ ruolo: "operatore" }, "can_manage_settings"), true);
assert.equal(hasCapability({ ruolo: "manager" }, "can_manage_settings"), true);
assert.equal(
  hasCapability({ ruolo: "operatore" }, "can_manage_settings", { operatorGlobalSettingsDbEnabled: false }),
  true,
);
assert.equal(hasCapability({ ruolo: "guest" }, "can_manage_settings"), false);

console.log("rbac.capability.test.ts OK");
