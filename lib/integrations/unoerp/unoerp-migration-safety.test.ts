import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const sql = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20261403120000_unoerp_integration.sql"),
  "utf8",
);
assert.doesNotMatch(sql, /act\s*=\s*'delete'/i);
assert.match(sql, /unoerp_sync_jobs/);
assert.match(sql, /operation in \('CREATE', 'UPDATE'\)/);
console.log("unoerp-migration-safety.test.ts: ok");
