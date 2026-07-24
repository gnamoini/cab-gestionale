import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { LOG_MODIFICHE_RETENTION_PER_ENTITA } from "@/lib/gestionale-log/log-modifiche-retention";
import { LOG_MODIFICHE_ENTITY_RETENTION_DEFAULT } from "@/lib/audit/retention-config";

const ROOT = process.cwd();

assert.equal(LOG_MODIFICHE_RETENTION_PER_ENTITA, 500);
assert.equal(LOG_MODIFICHE_ENTITY_RETENTION_DEFAULT, 500);

const retentionMigration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261026120100_audit_subsystem_retention_config.sql"),
  "utf8",
);
assert.match(retentionMigration, /prune_log_modifiche_per_entity/);
assert.match(retentionMigration, /entity_retention_default.*500/);
assert.match(retentionMigration, /dashboard_days.*90/);
assert.match(retentionMigration, /audit_entity_retention_limit/);

const fixMigration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261019140000_fix_prune_log_modifiche_retention_old_alias.sql"),
  "utf8",
);
assert.match(fixMigration, /prune_row\.entita = new\.entita/);

const p1cols = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261026120000_audit_subsystem_p1_columns.sql"),
  "utf8",
);
assert.match(p1cols, /event_type text/);
assert.match(p1cols, /actor_type text/);
assert.match(p1cols, /request_id uuid/);
assert.match(p1cols, /correlation_id uuid/);

console.log("log-modifiche-retention.test.ts OK");
