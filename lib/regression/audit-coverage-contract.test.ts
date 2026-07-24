import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  auditCoverage,
  AUDIT_COVERAGE_SERVICE_FILES,
} from "@/lib/audit/coverage-contract";

const ROOT = process.cwd();

for (const [module, actions] of Object.entries(auditCoverage)) {
  const rel = AUDIT_COVERAGE_SERVICE_FILES[module as keyof typeof AUDIT_COVERAGE_SERVICE_FILES];
  assert.ok(rel, `missing service file mapping for ${module}`);
  const content = fs.readFileSync(path.join(ROOT, rel), "utf8");
  assert.match(
    content,
    /writeModificaLog|recordAuditEvent|recordDataChange|recordWorkflowAction/,
    `${module}: service must call audit writer`,
  );
  for (const action of actions) {
    if (action === "CLOSE" || action === "APPROVE") continue;
    assert.match(content, new RegExp(action, "i"), `${module}: missing action coverage hint ${action}`);
  }
}

const auditIndex = fs.readFileSync(path.join(ROOT, "lib/audit/index.ts"), "utf8");
assert.match(auditIndex, /recordAuditEvent/);
assert.match(auditIndex, /getRecentActivities/);

console.log("audit-coverage-contract.test.ts OK");
