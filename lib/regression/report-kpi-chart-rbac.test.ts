import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const sql = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260910180100_report_saved_kpi_charts.sql"),
  "utf8",
);

assert.match(sql, /create table[\s\S]*report_saved_kpi_charts/i);
assert.match(sql, /references public\.profiles \(id\) on delete cascade/);
assert.doesNotMatch(sql, /\bscope\b/);
assert.match(sql, /enable row level security/);
assert.match(sql, /cap_report_saved_kpi_charts_own/);
assert.match(sql, /user_id = auth\.uid\(\)/);
assert.match(sql, /grant select, insert, update, delete.*authenticated/);
assert.match(sql, /trg_report_saved_kpi_charts_updated_at/);
assert.match(sql, /set_updated_at\(\)/);
assert.match(sql, /idx_report_saved_kpi_charts_user_name/);

console.log("report-kpi-chart-rbac.test.ts OK");
