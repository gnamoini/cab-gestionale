import assert from "node:assert/strict";
import { isInvalidRefreshAuthMessage } from "@/src/lib/auth/clear-invalid-auth-session";

assert.equal(isInvalidRefreshAuthMessage("Invalid Refresh Token: Refresh Token Not Found"), true);
assert.equal(isInvalidRefreshAuthMessage("JWT expired"), false);
assert.equal(isInvalidRefreshAuthMessage("Session expired"), true);

console.log("clear-invalid-auth-session.test.ts OK");
