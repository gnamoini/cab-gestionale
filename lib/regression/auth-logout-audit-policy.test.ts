import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const authCtx = read("context/auth-context.tsx");
const coordinator = read("src/lib/auth/auth-session-coordinator.client.ts");
const authGate = read("components/gestionale/gestionale-auth-gate.tsx");
const clearInvalid = read("src/lib/auth/clear-invalid-auth-session.ts");

assert.match(authCtx, /reconcileSeqRef/);
assert.match(authCtx, /AUTH_REFRESH_DEBOUNCE_MS/);
assert.doesNotMatch(authCtx, /RECONCILE_SUCCESS_TTL/);
assert.doesNotMatch(authCtx, /setStatus\("pending"\)/);
assert.match(authCtx, /applyReconcileVerdict/);
assert.match(authCtx, /signOut\(\{ scope: "global" \}\)/);
assert.doesNotMatch(authCtx, /signOut\(\{ scope: "local" \}\)/);

assert.doesNotMatch(coordinator, /clearInvalidAuthSession/);
assert.doesNotMatch(coordinator, /signOut/);

assert.doesNotMatch(authGate, /auth-session-coordinator/);
assert.match(authGate, /loginRedirectInFlightRef/);
assert.match(authGate, /refresh\(\{ force: true \}\)/);

assert.match(clearInvalid, /scope: "global"/);
assert.doesNotMatch(clearInvalid, /scope: "local"/);

const revokeAdmin = read("lib/auth/revoke-user-sessions.server.ts");
assert.match(revokeAdmin, /"global"/);
assert.doesNotMatch(authCtx, /revokeUserSessionsAdmin/);
assert.doesNotMatch(coordinator, /revokeUserSessionsAdmin/);

console.log("auth-logout-audit-policy.test.ts OK");
