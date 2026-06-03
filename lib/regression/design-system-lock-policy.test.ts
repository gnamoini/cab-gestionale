/**
 * Design System Lock — policy + baseline invariants.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  DS_LOCK_CLASS_ALLOWLIST,
  DS_LOCK_MESSAGE_PREFIX,
  TOOLBAR_CONTRACT,
  TABLE_CONTRACT,
} from "@/lib/ui-design-system-lock/component-contracts";
import {
  filterNonBaselineViolations,
  getBaselineEntries,
  isInBaseline,
} from "@/lib/ui-design-system-lock/design-system-lock";
import type { DesignSystemViolation } from "@/lib/ui-design-system-lock/layout-contract-validator";
import { FORBIDDEN_PATTERNS } from "@/lib/ui-design-system-lock/forbidden-patterns";
import {
  validateClassName,
  validateComponentTree,
  validateFileContent,
} from "@/lib/ui-design-system-lock/layout-contract-validator";
import { analyzeClassNameForUIContractViolation } from "@/lib/lint/rules/no-ui-contract-violation";

const ROOT = process.cwd();

assert.ok(FORBIDDEN_PATTERNS.length >= 6);
assert.ok(DS_LOCK_CLASS_ALLOWLIST.includes("globalTableWrap"));
assert.equal(TOOLBAR_CONTRACT.rowToken, "flex-safe-row");
assert.ok(TABLE_CONTRACT.forbiddenTokens.includes("prevTableTd"));

const baseline = getBaselineEntries();
assert.ok(baseline.length > 0, "baseline must grandfather existing violations");
assert.ok(fs.existsSync(path.join(ROOT, "lib/ui-design-system-lock/ds-lock-baseline.json")));

const flexBad = validateClassName("flex flex-1 gap-2");
assert.ok(flexBad.some((v) => v.rule === "flex-no-containment"));

const flexGood = validateClassName("flex flex-1 min-w-0 gap-2");
assert.equal(flexGood.filter((v) => v.rule === "flex-no-containment").length, 0);

const lintHit = analyzeClassNameForUIContractViolation("flex flex-1", "components/test.tsx");
assert.ok(lintHit?.message.includes(DS_LOCK_MESSAGE_PREFIX));

if (baseline[0]) {
  const entry = baseline[0];
  assert.equal(
    isInBaseline({
      rule: entry.rule as DesignSystemViolation["rule"],
      message: "test",
      severity: "blocker",
      file: entry.file,
      line: entry.line,
    }),
    true,
  );
}

const tree = validateComponentTree({
  name: "ToolbarGroupPrimaryRow",
  className: "flex gap-3",
  filePath: "components/design-system/toolbar-group.tsx",
  children: [],
});
assert.ok(tree.violations.some((v) => v.rule === "toolbar-missing-flex-safe-row"));

const allViolations = validateFileContent(
  "components/gestionale/test-view.tsx",
  'const x = "sticky top-4";',
);
assert.ok(allViolations.some((v) => v.rule === "toolbar-sticky"));

const nonBaseline = filterNonBaselineViolations(allViolations);
assert.ok(nonBaseline.length <= allViolations.length);

assert.match(
  fs.readFileSync(path.join(ROOT, "eslint.config.mjs"), "utf8"),
  /no-ui-contract-violation/,
);
assert.match(
  fs.readFileSync(path.join(ROOT, "components/gestionale/app-shell.tsx"), "utf8"),
  /DesignSystemLockMount/,
);

console.log(`design-system-lock-policy.test.ts OK (baseline: ${baseline.length} entries)`);
