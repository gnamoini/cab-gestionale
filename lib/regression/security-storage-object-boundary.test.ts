import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const migration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261226120600_security_storage_path_acl.sql"),
  "utf8",
);

assert.match(migration, /storage\.objects/);
assert.match(migration, /insert/i);

console.log("security-storage-object-boundary.test: OK (policy SQL present)");
