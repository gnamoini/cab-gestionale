import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const batchMigration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260718120000_data_import_infrastructure.sql"),
  "utf8",
);
assert.match(batchMigration, /import_batches/, "import_batches table");
assert.doesNotMatch(batchMigration, /stacktrace/i, "business audit must not reference stacktrace fields");

const v3Migration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260910170000_import_export_framework_v3.sql"),
  "utf8",
);
assert.match(v3Migration, /fingerprint_hash/);
assert.match(v3Migration, /import_export_telemetry/);
assert.match(v3Migration, /export_jobs/);
assert.match(v3Migration, /ordini_fornitori/);

const auditMigration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260910153000_import_core_foundation.sql"),
  "utf8",
);
assert.match(auditMigration, /import_audit_events/);
assert.match(auditMigration, /correlation_id/);
assert.match(auditMigration, /event_type/);
assert.match(auditMigration, /payload/);

const telemetrySrc = fs.readFileSync(
  path.join(ROOT, "lib/data-import/core/import-export-telemetry.server.ts"),
  "utf8",
);
assert.match(telemetrySrc, /duration_ms/);
assert.match(telemetrySrc, /correlation_id/);
assert.doesNotMatch(telemetrySrc, /stacktrace/i);

const batchStore = fs.readFileSync(path.join(ROOT, "lib/data-import/core/batch-store.server.ts"), "utf8");
assert.match(batchStore, /fingerprint_hash/);
assert.doesNotMatch(batchStore, /user_agent|ip_address|stack/i);

console.log("audit-schema-contract.test.ts OK");
