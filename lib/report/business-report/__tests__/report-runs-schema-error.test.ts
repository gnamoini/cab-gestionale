import assert from "node:assert/strict";
import { isReportRunsSchemaError } from "@/lib/report/business-report/storage/report-runs-schema-error";

assert.equal(
  isReportRunsSchemaError("Could not find the table 'public.report_runs' in the schema cache"),
  true,
);
assert.equal(isReportRunsSchemaError("relation \"report_runs\" does not exist"), true);
assert.equal(isReportRunsSchemaError("permission denied"), false);

console.log("report-runs-schema-error.test.ts OK");
