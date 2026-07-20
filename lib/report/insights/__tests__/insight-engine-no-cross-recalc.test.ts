import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const FORBIDDEN = [/\bbuildReportCrossDto\b/];

const ruleFiles = [
  "lib/report/insights/rules/lavorazioni.rules.ts",
  "lib/report/insights/rules/magazzino.rules.ts",
  "lib/report/insights/rules/ore.rules.ts",
  "lib/report/insights/rules/economico.rules.ts",
  "lib/report/insights/rules/cross.rules.ts",
  "lib/report/insights/rules/compliance.rules.ts",
  "lib/report/insights/engine/evaluate-insight-rules.ts",
];

for (const rel of ruleFiles) {
  const src = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
  for (const re of FORBIDDEN) {
    assert.doesNotMatch(src, re, `${rel} must not import buildReportCrossDto`);
  }
}

const crossSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/insights/rules/cross.rules.ts"),
  "utf8",
);
assert.match(crossSrc, /ctx\.signals\.cross/);

console.log("insight-engine-no-cross-recalc.test.ts OK");
