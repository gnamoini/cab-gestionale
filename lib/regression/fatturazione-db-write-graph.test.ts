import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildWriteGraphMarkdown, findAxesUpdateViolations } from "@/lib/fatturazione/db-write-graph";

const ROOT = process.cwd();
const migrationsDir = path.join(ROOT, "supabase/migrations");

const violations = findAxesUpdateViolations(migrationsDir);
if (violations.length > 0) {
  const msg = violations
    .map((v) => `${v.file}:${v.line} in ${v.functionName ?? "global"} — ${v.snippet}`)
    .join("\n");
  assert.fail(`UPDATE assi fuori da invoice_write_status_axes:\n${msg}`);
}

const ssotMigration = fs.readFileSync(
  path.join(migrationsDir, "20260910150500_fatturazione_status_axes_ssot.sql"),
  "utf8",
);
assert.match(ssotMigration, /invoice_write_status_axes/);
assert.match(ssotMigration, /invoice_guard_direct_axes_update/);

const graphDoc = path.join(ROOT, "docs/fatturazione-db-write-graph.md");
fs.writeFileSync(graphDoc, buildWriteGraphMarkdown(migrationsDir), "utf8");
assert.ok(fs.existsSync(graphDoc));

console.log("fatturazione-db-write-graph.test.ts OK");
