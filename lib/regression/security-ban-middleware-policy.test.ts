import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const resolveAuth = fs.readFileSync(path.join(ROOT, "src/lib/auth/resolve-server-auth.ts"), "utf8");
const banState = fs.readFileSync(path.join(ROOT, "lib/auth/user-ban-state.ts"), "utf8");
const batchActions = fs.readFileSync(path.join(ROOT, "src/actions/security-users-permissions.ts"), "utf8");
const adminUsers = fs.readFileSync(path.join(ROOT, "src/actions/admin-users.ts"), "utf8");

/** 3a — SSOT ban helper, no scattered banned_until in UI/actions (except SSOT module). */
assert.match(banState, /banned_until/);
assert.match(banState, /export function isUserBanned/);
assert.match(batchActions, /isUserBanned/);
assert.match(adminUsers, /accountEnabledFromAuthUser/);

/** 3b — Server auth snapshot clears session when user is banned. */
assert.match(resolveAuth, /isUserBanned\(authUser\)/);
assert.match(resolveAuth, /signOut/);

/** 3c — Batch update rejects mutations on banned targets. */
assert.match(batchActions, /if \(isUserBanned\(authLookup\.data\.user\)\)/);

console.log("security-ban-middleware-policy.test.ts OK");
