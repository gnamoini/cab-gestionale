import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const tab = fs.readFileSync(
  path.join(process.cwd(), "lib/notifications/realtime-tab-coordinator.ts"),
  "utf8",
);

assert.match(tab, /BroadcastChannel/);
assert.match(tab, /leader_claim/);
assert.match(tab, /leader_release/);
assert.match(tab, /invalidate/);
assert.match(tab, /50\)/, "leader claim delay reduced for faster failover");

console.log("realtime-tab-coordinator.test.ts OK");
