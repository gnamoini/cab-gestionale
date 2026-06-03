/**
 * Design System Lock — layout contract validator unit tests.
 */
import assert from "node:assert/strict";
import {
  validateComponentTree,
  validateClassName,
  dedupeViolations,
} from "@/lib/ui-design-system-lock/layout-contract-validator";

const cleanTree = validateComponentTree({
  name: "PageToolbar",
  className: "dsPageToolbar min-w-0",
  children: [
    {
      name: "ToolbarGroupPrimaryRow",
      className: "flex-safe-row min-w-0 flex-col gap-3 sm:flex-row",
      children: [],
    },
  ],
});
assert.ok(cleanTree.severityScore >= 80);

const badTree = validateComponentTree({
  name: "div",
  className: "flex flex-1 p-4",
  children: [
    {
      name: "table",
      className: "text-sm w-full",
      filePath: "components/gestionale/foo-view.tsx",
      children: [],
    },
  ],
});
assert.ok(badTree.violations.length > 0);
assert.ok(badTree.severityScore < 100);

const deduped = dedupeViolations([
  { rule: "flex-no-containment", message: "a", severity: "blocker" },
  { rule: "flex-no-containment", message: "a", severity: "blocker" },
]);
assert.equal(deduped.length, 1);

assert.equal(validateClassName("min-w-0 flex-1 flex-safe-row").length, 0);
assert.ok(validateClassName("flex-1 only-grow").some((v) => v.rule === "flex-no-containment"));

console.log("layout-contract-validator.test.ts OK");
