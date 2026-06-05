import assert from "node:assert/strict";
import {
  formatSecurityLastSignInRelative,
  formatSecurityWhen,
  securitySignInActivity,
  securityUserPresence,
} from "./format-last-sign-in";

const now = new Date("2026-06-05T12:00:00Z").getTime();

assert.equal(securityUserPresence("2026-06-05T11:45:00Z", now), "online");
assert.equal(securityUserPresence("2026-06-05T10:45:00Z", now), "offline");
assert.equal(securityUserPresence(null, now), "never");

assert.equal(securitySignInActivity("2026-06-04T12:00:00Z", now), "active");
assert.equal(securitySignInActivity("2026-05-01T12:00:00Z", now), "inactive");
assert.equal(securitySignInActivity("2026-01-01T12:00:00Z", now), "dormant");
assert.equal(securitySignInActivity(null, now), "never");

assert.equal(formatSecurityLastSignInRelative("2026-06-05T11:59:30Z", now), "Online ora");
assert.equal(formatSecurityLastSignInRelative("2026-06-05T11:00:00Z", now), "1 h fa");
assert.equal(formatSecurityLastSignInRelative("2026-06-04T12:00:00Z", now), "Ieri");
assert.equal(formatSecurityLastSignInRelative("2026-05-15T12:00:00Z", now), "3 sett. fa");

assert.match(formatSecurityWhen("2026-06-05T11:00:00Z"), /\d/);

console.log("format-last-sign-in.test.ts: ok");
