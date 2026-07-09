import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const REQUIRED_TESTS = [
  "lib/regression/fatturazione-status-write-audit.test.ts",
  "lib/regression/fatturazione-db-write-graph.test.ts",
  "lib/fatturazione/open-items-reconciliation.test.ts",
  "lib/regression/fatturazione-events-coverage.test.ts",
  "lib/regression/fatturazione-explain-plans.test.ts",
  "lib/regression/fatturazione-module-isolation.test.ts",
  "lib/fatturazione/allocate-invoice-number.concurrency.test.ts",
] as const;

const REQUIRED_DOCS = [
  "docs/fatturazione-production-readiness.md",
  "docs/fatturazione-performance-checklist.md",
  "docs/fatturazione-numbering-policy.md",
  "docs/fatturazione-accounting-idempotency.md",
  "docs/fatturazione-db-write-graph.md",
] as const;

for (const t of REQUIRED_TESTS) {
  assert.ok(fs.existsSync(path.join(ROOT, t)), `manca test ${t}`);
}

for (const d of REQUIRED_DOCS) {
  assert.ok(fs.existsSync(path.join(ROOT, d)), `manca doc ${d}`);
}

const ssot = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260910150500_fatturazione_status_axes_ssot.sql"),
  "utf8",
);
assert.match(ssot, /invoice_write_status_axes/);
assert.match(ssot, /p_expected_version/);

const recon = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260910150600_fatturazione_reconciliation_reports.sql"),
  "utf8",
);
assert.match(recon, /invoice_legacy_status_audit_report/);
assert.match(recon, /invoice_status_backfill_snapshot/);

console.log("fatturazione-production-readiness.test.ts OK");
