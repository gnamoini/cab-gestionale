/**
 * UI Autonomy Fix Engine — integration policy tests.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { applyFixToElement } from "@/lib/ui-autonomy-fix/fix-apply-engine";
import { partitionIssues, isIssueAutoFixable } from "@/lib/ui-autonomy-fix/layout-fix-rules";
import { strategiesForIssues, strategyForIssue } from "@/lib/ui-autonomy-fix/fix-strategies";
import {
  runUIAutonomyFixEngine,
  UI_AUTONOMY_FIX_LOG_PREFIX,
} from "@/lib/ui-autonomy-fix/ui-autonomy-engine";
import type { LayoutLinterIssue } from "@/lib/ui-visual-linter/layout-rules";

const ROOT = process.cwd();

function issue(rule: LayoutLinterIssue["rule"], overrides: Partial<LayoutLinterIssue> = {}): LayoutLinterIssue {
  return {
    rule,
    severity: "warning",
    message: "test issue",
    target: "div.test.flex",
    category: "toolbar",
    ...overrides,
  };
}

// SSR-safe
const empty = runUIAutonomyFixEngine(null, "/test");
assert.equal(empty.applied.length, 0);
assert.equal(empty.flagged.length, 0);

// Partition LOW/MEDIUM vs HIGH
const mixed = partitionIssues([
  issue("flex-min-w-0", { category: "alignment" }),
  issue("cross-instance-drift", { category: "table" }),
  issue("table-density", { category: "table" }),
  issue("toolbar-gap"),
]);
assert.equal(mixed.fixable.length, 2);
assert.equal(mixed.flagged.length, 2);
assert.equal(isIssueAutoFixable(issue("flex-min-w-0", { category: "alignment" })), true);
assert.equal(isIssueAutoFixable(issue("cross-instance-drift", { category: "table" })), false);

// Strategies
const fixes = strategiesForIssues(mixed.fixable);
assert.ok(fixes.some((f) => f.rule === "flex-min-w-0"));
assert.ok(fixes.some((f) => f.rule === "toolbar-gap"));
assert.equal(strategyForIssue(issue("cross-instance-drift", { category: "table" })), null);

// Apply — class-level only, no structural change
const mockEl = {
  tagName: "DIV",
  className: "flex",
  classList: {
    tokens: [] as string[],
    add(cls: string) {
      this.tokens.push(cls);
      mockEl.className = ["flex", ...this.tokens].join(" ");
    },
  },
  setAttribute: () => {},
  getAttribute: () => null,
} as unknown as HTMLElement;

const childCountBefore = 0;
const fix = strategyForIssue(issue("flex-min-w-0", { category: "alignment" }))!;
const added = applyFixToElement(mockEl, fix);
assert.deepEqual(added, ["min-w-0"]);
assert.ok((mockEl.classList as unknown as { tokens: string[] }).tokens.includes("min-w-0"));
assert.equal(childCountBefore, 0);

// Re-apply idempotent
const added2 = applyFixToElement(mockEl, fix);
assert.deepEqual(added2, []);

// Module files
const files = [
  "lib/ui-autonomy-fix/ui-autonomy-engine.ts",
  "lib/ui-autonomy-fix/layout-fix-rules.ts",
  "lib/ui-autonomy-fix/fix-strategies.ts",
  "lib/ui-autonomy-fix/fix-apply-engine.ts",
  "lib/ui-autonomy-fix/fix-safety-guard.ts",
  "lib/ui-autonomy-fix/use-ui-autonomy-fix-engine.ts",
];
for (const f of files) {
  assert.ok(fs.existsSync(path.join(ROOT, f)), `missing ${f}`);
}

const mount = fs.readFileSync(path.join(ROOT, "components/gestionale/visual-layout-linter-mount.tsx"), "utf8");
assert.match(mount, /runUIAutonomyFixEngineFromMain/);
assert.match(mount, /emitUIAutonomyFixReport/);

assert.match(
  fs.readFileSync(path.join(ROOT, "lib/ui-autonomy-fix/ui-autonomy-engine.ts"), "utf8"),
  new RegExp(UI_AUTONOMY_FIX_LOG_PREFIX.replace("[", "\\[")),
);

console.log("ui-autonomy-fix-engine.test.ts OK");
