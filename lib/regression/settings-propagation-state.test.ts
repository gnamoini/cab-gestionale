import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { detectDuplicateTargetCollision } from "@/lib/settings/rename-engine/duplicate-target-policy";

const blocked = detectDuplicateTargetCollision({
  kind: "utilizzatore",
  oldLabel: "AMIU Trani SPA",
  newLabel: "AMIU Trani",
  catalogBeforeRename: ["AMIU Trani SPA", "AMIU Trani"],
});
assert.equal(blocked.blocked, true);
assert.equal(blocked.policy, "manual_review");

const migration = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260805120000_settings_rename_propagation_status.sql"),
  "utf8",
);
assert.match(migration, /propagation_status/);
assert.match(migration, /live_propagation/);

const engine = fs.readFileSync(path.join(process.cwd(), "src/services/settings-rename-engine.service.ts"), "utf8");
assert.match(engine, /propagation_status: "propagated"/);
assert.match(engine, /propagation_status: "configuration_only"/);
assert.match(engine, /SETTINGS_PROPAGATION_DRIFT_DETECTED/);

const jobService = fs.readFileSync(path.join(process.cwd(), "src/services/settings-rename-job.service.ts"), "utf8");
assert.match(jobService, /createPendingJobs/);
assert.match(jobService, /insertJobDetails/);

console.log("settings-propagation-state.test.ts OK");
