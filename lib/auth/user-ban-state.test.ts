import assert from "node:assert/strict";
import {
  accountEnabledFromAuthUser,
  bannedUntilFromAuthUser,
  isUserBanned,
} from "@/lib/auth/user-ban-state";

const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

assert.equal(isUserBanned({ banned_until: future }), true);
assert.equal(isUserBanned({ banned_until: past }), false);
assert.equal(isUserBanned({ banned_until: null }), false);
assert.equal(isUserBanned(undefined), false);
assert.equal(accountEnabledFromAuthUser({ banned_until: future }), false);
assert.equal(accountEnabledFromAuthUser({ banned_until: past }), true);
assert.equal(bannedUntilFromAuthUser({ banned_until: future }), future);

console.log("user-ban-state.test.ts OK");
