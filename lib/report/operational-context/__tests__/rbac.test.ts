import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const api = readFileSync(
  join(process.cwd(), "lib/report/operational-context/api/report-operational-context-api.ts"),
  "utf8",
);
assert.ok(api.includes('verifyServerPageRead("report")'), "operational context API must enforce report RBAC");
assert.ok(api.includes("403"), "operational context API must return 403 on deny");
console.log("rbac.test.ts OK");
