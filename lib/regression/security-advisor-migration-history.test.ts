/**
 * Security advisor migration history: remote stubs + canonical follow-up.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MIGRATIONS = path.join(ROOT, "supabase/migrations");

const remoteAlignedStubs = [
  "20260915234226_security_advisor_linter_followup.sql",
  "20260915234901_security_advisor_linter_followup_20270316.sql",
] as const;

const canonical = "20270316120000_security_advisor_linter_followup.sql";

for (const file of remoteAlignedStubs) {
  const full = path.join(MIGRATIONS, file);
  assert.ok(fs.existsSync(full), `missing remote-aligned stub ${file}`);
  const sql = fs.readFileSync(full, "utf8");
  assert.match(sql, /20270316120000_security_advisor_linter_followup/i, `${file} must reference canonical migration`);
}

const canonicalPath = path.join(MIGRATIONS, canonical);
assert.ok(fs.existsSync(canonicalPath), `missing canonical ${canonical}`);
const canonicalSql = fs.readFileSync(canonicalPath, "utf8");
assert.match(canonicalSql, /security_invoker\s*=\s*true/i);
assert.match(canonicalSql, /has_function_privilege\('anon'/i);

console.log("security-advisor-migration-history.test: OK");
