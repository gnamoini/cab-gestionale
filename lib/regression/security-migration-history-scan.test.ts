/**
 * Informational: migration security history report exists (from audit-migration-security-patterns).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, "docs/security/migration-security-history-report.json");

assert.ok(fs.existsSync(REPORT_PATH), `missing report — run: npx tsx scripts/audit-migration-security-patterns.ts`);

const report = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8")) as {
  migrationsScanned?: number;
  grantExecuteAnonCount?: number;
};

assert.ok(typeof report.migrationsScanned === "number", "report.migrationsScanned required");
assert.ok(typeof report.grantExecuteAnonCount === "number", "report.grantExecuteAnonCount required");

console.log(
  `security-migration-history-scan.test: OK (${report.grantExecuteAnonCount} historical GRANT→anon in ${report.migrationsScanned} migrations)`,
);
