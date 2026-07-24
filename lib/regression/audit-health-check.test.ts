import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

assert.ok(fs.existsSync(path.join(ROOT, "app/api/admin/audit-health/route.ts")));
const route = fs.readFileSync(path.join(ROOT, "app/api/admin/audit-health/route.ts"), "utf8");
assert.match(route, /log_modifiche/);
assert.match(route, /audit_coverage_events/);
assert.match(route, /verifyServerIsAdmin/);

console.log("audit-health-check.test.ts OK");
