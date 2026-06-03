/**
 * Visual Layout Linter — layout score unit tests.
 */
import assert from "node:assert/strict";
import type { LayoutLinterIssue } from "@/lib/ui-visual-linter/layout-rules";
import { computeLayoutScore, layoutScoreRiskLevel } from "@/lib/ui-visual-linter/layout-score";

function issue(category: LayoutLinterIssue["category"], rule = "toolbar-gap"): LayoutLinterIssue {
  return {
    rule: rule as LayoutLinterIssue["rule"],
    severity: "warning",
    message: "test issue",
    target: "test",
    category,
  };
}

const empty = computeLayoutScore([]);
assert.equal(empty.overall, 100);
assert.equal(empty.toolbarConsistency, 100);

const oneToolbar = computeLayoutScore([issue("toolbar")]);
assert.equal(oneToolbar.toolbarConsistency, 92);
assert.ok(oneToolbar.overall < 100);
assert.ok(oneToolbar.overall >= 90);

const mixed = computeLayoutScore([
  issue("toolbar"),
  issue("table", "table-density"),
  issue("modal", "modal-body-padding"),
  issue("spacing", "cross-instance-drift"),
  issue("alignment", "flex-min-w-0"),
]);
assert.ok(mixed.toolbarConsistency < 100);
assert.ok(mixed.tableConsistency < 100);
assert.ok(mixed.modalConsistency < 100);
assert.ok(mixed.overall >= 0 && mixed.overall <= 100);

const manyTable = computeLayoutScore([
  issue("table", "table-density"),
  issue("table", "table-density"),
  issue("table", "table-density"),
  issue("table", "table-density"),
  issue("table", "table-density"),
  issue("table", "table-density"),
  issue("table", "table-density"),
  issue("table", "table-density"),
  issue("table", "table-density"),
  issue("table", "table-density"),
  issue("table", "table-density"),
]);
assert.equal(manyTable.tableConsistency, 0);
assert.ok(manyTable.overall < manyTable.toolbarConsistency);

assert.equal(layoutScoreRiskLevel(90), "safe");
assert.equal(layoutScoreRiskLevel(70), "risk");
assert.equal(layoutScoreRiskLevel(50), "review");

console.log("layout-score.test.ts OK");
