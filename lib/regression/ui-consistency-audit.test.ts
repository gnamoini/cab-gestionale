/**
 * UI consistency audit — regression gate wrapper.
 */
import assert from "node:assert/strict";
import { auditUiConsistencyRepo, countBySeverity } from "@/lib/ui/ui-consistency-audit";
import { UI_CONTRACT_VERSION } from "@/lib/ui-design-system-lock/component-contracts";

const report = auditUiConsistencyRepo();
assert.equal(report.contractVersion, UI_CONTRACT_VERSION);

const sev = countBySeverity(report.findings);
assert.equal(sev.blocker, 0, `UI blockers: ${report.findings.filter((f) => f.severity === "BLOCKER").map((f) => `${f.file}:${f.line}`).join(", ")}`);

console.log(`ui-consistency-audit.test OK (${report.passCount} conformi, ${sev.warn} warnings)`);
