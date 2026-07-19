import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { LOG_MODIFICHE_RETENTION_PER_ENTITA } from "@/lib/gestionale-log/log-modifiche-retention";
import { GESTIONALE_LOG_FEED_LIMIT } from "@/lib/react-query/query-layer-policies";

const ROOT = process.cwd();
const migration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260603120000_log_modifiche_retention_100.sql"),
  "utf8",
);

assert.equal(LOG_MODIFICHE_RETENTION_PER_ENTITA, 100);
assert.equal(GESTIONALE_LOG_FEED_LIMIT, 100);

assert.match(migration, /prune_log_modifiche_retention/);
assert.match(migration, /partition by entita/i);
assert.match(migration, /trg_log_modifiche_retention/);
assert.match(migration, /max_keep constant int := 100/);

const fixMigration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261019140000_fix_prune_log_modifiche_retention_old_alias.sql"),
  "utf8",
);
assert.doesNotMatch(fixMigration, /delete from public\.log_modifiche old\b/);
assert.match(fixMigration, /prune_row\.entita = new\.entita/);

const logService = fs.readFileSync(path.join(ROOT, "src/services/log.service.ts"), "utf8");
assert.match(logService, /LOG_MODIFICHE_RETENTION_PER_ENTITA/);

// ponytail: retention 100/tipo — rivalutare solo se test post-fix mostrano perdita diversità; non causa tipica per attività recenti.
assert.match(migration, /partition by entita/i);

console.log("log-modifiche-retention.test.ts OK");
