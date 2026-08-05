import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const bridge = fs.readFileSync(
  path.join(process.cwd(), "src/components/gestionale-realtime-bridge.tsx"),
  "utf8",
);
assert.match(bridge, /listPendingOrDriftJobs/);
assert.match(bridge, /remoteSettingsNotifyMessage/);
assert.doesNotMatch(bridge, /scheduleInvalidate\("mezzi"/);

const handlers = fs.readFileSync(
  path.join(process.cwd(), "lib/realtime/settings-propagation-realtime.ts"),
  "utf8",
);
assert.match(handlers, /remoteAppSettingsInvalidationTables/);

console.log("settings-realtime-propagation-status.test.ts OK");
