import assert from "node:assert/strict";
import {
  PRESENCE_STALE_ONLINE_MS,
  resolveDevicePresence,
} from "@/lib/notifications/delivery/resolver/presence-resolver";

const now = Date.parse("2026-07-20T12:00:00.000Z");
const fresh = new Date(now - 30_000).toISOString();
const stale = new Date(now - PRESENCE_STALE_ONLINE_MS - 1).toISOString();

assert.equal(resolveDevicePresence({ presence_status: "ONLINE", presence_updated_at: fresh }, now), "ONLINE");
assert.equal(resolveDevicePresence({ presence_status: "ONLINE", presence_updated_at: stale }, now), "BACKGROUND");
assert.equal(resolveDevicePresence({ presence_status: "ONLINE", presence_updated_at: null }, now), "BACKGROUND");
assert.equal(resolveDevicePresence({ presence_status: "BACKGROUND", presence_updated_at: stale }, now), "BACKGROUND");

console.log("presence-resolver.test.ts OK");
