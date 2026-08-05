import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const propagation = fs.readFileSync(
  path.join(process.cwd(), "src/services/settings-rename-propagation.service.ts"),
  "utf8",
);
assert.match(propagation, /countUpdate\(c, table, \{ \[column\]: to \}, \{ \[column\]: from \}\)/);

const jobService = fs.readFileSync(path.join(process.cwd(), "src/services/settings-rename-job.service.ts"), "utf8");
assert.match(jobService, /insertJobDetails/);

const engine = fs.readFileSync(path.join(process.cwd(), "src/services/settings-rename-engine.service.ts"), "utf8");
assert.match(engine, /execution_id: input\.plan\.correlationId/);
assert.match(engine, /propagateRenames\(\[planToEntry/);

console.log("settings-rename-idempotency.test.ts OK");
