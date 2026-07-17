import assert from "node:assert/strict";
import {
  isTransientNetworkAuthError,
  shouldClearSessionOnAuthError,
  isRecoverableAuthError,
} from "@/src/lib/auth/auth-network-retry";

assert.equal(
  shouldClearSessionOnAuthError(new Error("Invalid Refresh Token: Refresh Token Not Found")),
  true,
);
assert.equal(shouldClearSessionOnAuthError(new Error("Session expired")), true);
assert.equal(shouldClearSessionOnAuthError({ message: "Forbidden", status: 403 } as Error & { status: number }), false);
assert.equal(shouldClearSessionOnAuthError({ message: "Unauthorized", status: 401 } as Error & { status: number }), false);
assert.equal(shouldClearSessionOnAuthError(new Error("JWT expired")), false);

assert.equal(isRecoverableAuthError(new Error("JWT expired")), true);
assert.equal(isRecoverableAuthError(new Error("Invalid Refresh Token: Refresh Token Not Found")), false);
assert.equal(isRecoverableAuthError(new Error("Failed to fetch")), false);

assert.equal(isTransientNetworkAuthError(new Error("Failed to fetch")), true);
assert.equal(isTransientNetworkAuthError(new Error("503 Service Unavailable")), true);

import { getUserWithAuthRetry } from "@/src/lib/auth/auth-network-retry";
assert.equal(typeof getUserWithAuthRetry, "function");

console.log("auth-network-retry.test.ts OK");
