import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const engineSrc = fs.readFileSync(
  path.join(ROOT, "lib/accounting/accounting-engine.server.ts"),
  "utf8",
);
const periodsSrc = fs.readFileSync(
  path.join(ROOT, "lib/accounting/accounting-periods.server.ts"),
  "utf8",
);
const fase4Rpc = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20270111120100_accounting_period_rpc_fase4.sql"),
  "utf8",
);

// App layer must not pass client-controlled period FKs in create/update payloads
assert.doesNotMatch(engineSrc, /fiscal_period_id/);
assert.doesNotMatch(engineSrc, /accounting_period_id/);
assert.doesNotMatch(
  engineSrc.match(/export type AccountingCreateEntryInput = \{[\s\S]*?\};/)?.[0] ?? "",
  /fiscal_year_id/,
);
assert.doesNotMatch(
  engineSrc.match(/export type AccountingCreateEntryInput = \{[\s\S]*?\};/)?.[0] ?? "",
  /period_id/,
);

// Period management only via dedicated server wrappers
assert.match(periodsSrc, /accounting_close_accounting_period/);
assert.match(periodsSrc, /accounting_lock_accounting_period/);
assert.doesNotMatch(periodsSrc, /\.from\("accounting_periods"\)\.update/);
assert.doesNotMatch(periodsSrc, /\.from\("accounting_fiscal_years"\)\.update/);

// Reverse requires explicit date
assert.match(engineSrc, /p_reversal_date/);
assert.match(fase4Rpc, /p_reversal_date is required/);

console.log("accounting-periods-bypass.test.ts OK");
