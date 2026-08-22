import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const fix = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261223120000_report_rls_exec_fix.sql"),
  "utf8",
);

assert.match(fix, /rbac_report_page_read/);
assert.match(fix, /rbac_report_page_write/);
assert.match(fix, /grant execute on function public\.rbac_report_page_read\(\) to authenticated/);
assert.doesNotMatch(
  fix,
  /create policy cap_report_runs_select[\s\S]*rbac_user_page_access_level/,
  "report_runs RLS must not call rbac_user_page_access_level directly",
);

console.log("report-rls-exec-fix.test.ts OK");
