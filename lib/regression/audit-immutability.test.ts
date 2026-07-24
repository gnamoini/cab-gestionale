import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const rlsMigration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260519150100_rbac_capabilities_refactor.sql"),
  "utf8",
);
assert.match(rlsMigration, /cap_log_select/);
assert.match(rlsMigration, /cap_log_insert/);
assert.doesNotMatch(rlsMigration, /cap_log_update/, "log_modifiche must not have UPDATE policy");

const p2 = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261026120300_audit_subsystem_p2_not_null.sql"),
  "utf8",
);
assert.match(p2, /event_type set not null/i);
assert.match(p2, /actor_type set not null/i);

const auditLog = fs.readFileSync(path.join(ROOT, "src/services/internal/audit-log.ts"), "utf8");
assert.doesNotMatch(auditLog, /\.update\s*\(\s*\{[^}]*\}\s*\)\s*\.eq\s*\(\s*['"]id['"]/);

console.log("audit-immutability.test.ts OK");
