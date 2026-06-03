/**
 * UI overflow regression — static scan componenti + unit lint analyzer.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  analyzeClassNameForFlexOverflowRisk,
  FLEX_SYSTEM_LINT_MESSAGE,
} from "@/lib/lint/rules/no-flex-overflow-risk";

const ROOT = process.cwd();

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkTsx(p, out);
    else if (/\.tsx$/.test(ent.name)) out.push(p);
  }
  return out;
}

// --- Unit: analyzeClassNameForFlexOverflowRisk ---
assert.equal(
  analyzeClassNameForFlexOverflowRisk("flex-1 overflow-hidden")?.reason,
  "flex-grow-without-containment",
);
assert.ok(analyzeClassNameForFlexOverflowRisk("flex-1 gap-2"));
assert.equal(analyzeClassNameForFlexOverflowRisk("flex-1 min-w-0"), null);
assert.equal(analyzeClassNameForFlexOverflowRisk("flex-fill-safe"), null);
assert.equal(analyzeClassNameForFlexOverflowRisk("dsPageToolbar min-w-0"), null);
assert.equal(
  analyzeClassNameForFlexOverflowRisk("custom-toolbar-panel flex gap-2")?.message,
  FLEX_SYSTEM_LINT_MESSAGE,
);

// --- Scan: flex-1 without containment (baseline-aware — no zero-tolerance) ---
import {
  flexViolationFingerprint,
  type FlexBaselineFile,
} from "@/lib/lint/flex-baseline-fingerprint";
import { scanFlexViolations } from "@/lib/lint/scan-flex-violations";

const baselinePath = path.join(ROOT, ".eslint-flex-baseline.json");
assert.ok(fs.existsSync(baselinePath), ".eslint-flex-baseline.json required");
const flexBaseline = JSON.parse(fs.readFileSync(baselinePath, "utf8")) as FlexBaselineFile;
const scanned = scanFlexViolations(ROOT);
const baselineFps = new Set(flexBaseline.entries.map(flexViolationFingerprint));
const newFlexViolations = scanned.filter((e) => !baselineFps.has(flexViolationFingerprint(e)));
assert.equal(
  newFlexViolations.length,
  0,
  `new flex overflow risks: ${newFlexViolations.map((v) => `${v.file}:${v.line}`).join(", ")}`,
);

// --- Scan: flex without min-w-0 anywhere in file (legacy heuristic retained) ---
function fileUsesFlexLayoutClass(content: string): boolean {
  return /\bclassName=(?:\{[`"']|[`"']).*?\bflex(?:\s|`|"|'|-)/.test(content);
}

const flexNoMinW0: string[] = [];
for (const file of walkTsx(path.join(ROOT, "components"))) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const content = fs.readFileSync(file, "utf8");
  if (fileUsesFlexLayoutClass(content) && !/\bmin-w-0\b/.test(content)) {
    flexNoMinW0.push(rel);
  }
}
assert.equal(flexNoMinW0.length, 0, `flex without min-w-0 in file: ${flexNoMinW0.join(", ")}`);

console.log("ui-overflow-regression.test.ts OK");
