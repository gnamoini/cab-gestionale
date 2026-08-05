import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { LOG_MODIFICHE_RETENTION_PER_ENTITA } from "@/lib/gestionale-log/log-modifiche-retention";
import { LOG_MODIFICHE_ENTITY_RETENTION_DEFAULT } from "@/lib/audit/retention-config";

const ROOT = process.cwd();

assert.equal(LOG_MODIFICHE_RETENTION_PER_ENTITA, 100);
assert.equal(LOG_MODIFICHE_ENTITY_RETENTION_DEFAULT, 100);

const entityHistoryMigration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261110120000_log_modifiche_entity_history_retention.sql"),
  "utf8",
);
assert.match(entityHistoryMigration, /autore_nome_snapshot/);
assert.match(entityHistoryMigration, /audit_history_retention/);
assert.match(entityHistoryMigration, /hashtextextended/);
assert.match(entityHistoryMigration, /__GLOBAL__/);
assert.match(entityHistoryMigration, /partition by entita, coalesce\(entita_id::text, '__GLOBAL__'\)/i);
assert.match(entityHistoryMigration, /get_activity_feed/);
assert.match(entityHistoryMigration, /idx_log_modifiche_entity_history/);
assert.match(entityHistoryMigration, /idx_log_modifiche_created_at/);
assert.match(entityHistoryMigration, /prune_mezzo_anagrafica_history_retention/);
assert.match(entityHistoryMigration, /ENTITY_HISTORY retention/);

const legacyMigration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261026120100_audit_subsystem_retention_config.sql"),
  "utf8",
);
assert.match(legacyMigration, /prune_log_modifiche_per_entity/);
assert.match(legacyMigration, /audit_entity_retention_limit/);

console.log("log-modifiche-retention.test.ts OK");
