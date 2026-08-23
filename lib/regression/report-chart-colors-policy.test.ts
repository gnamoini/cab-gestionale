import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { REPORT_CHART_COLOR_ALLOWLIST } from "@/lib/report/ui/chart-color-allowlist";

const CHART_DIRS = [
  path.join(process.cwd(), "components", "report", "primitives", "chart"),
  path.join(process.cwd(), "components", "report", "report-charts.tsx"),
];

const HEX = /#[0-9a-fA-F]{3,8}\b/;
const RGB = /\brgba?\s*\(/;
const HSL = /\bhsla?\s*\(/;

function scanFile(filePath: string, rel: string): string[] {
  const content = fs.readFileSync(filePath, "utf8");
  const violations: string[] = [];
  for (const allow of REPORT_CHART_COLOR_ALLOWLIST) {
    if (content.includes(allow)) return violations;
  }
  if (HEX.test(content)) violations.push(`${rel}: hardcoded hex color`);
  if (RGB.test(content)) violations.push(`${rel}: rgb/rgba color`);
  if (HSL.test(content)) violations.push(`${rel}: hsl/hsla color`);
  return violations;
}

const allViolations: string[] = [];

for (const target of CHART_DIRS) {
  if (fs.statSync(target).isFile()) {
    allViolations.push(...scanFile(target, path.relative(process.cwd(), target)));
    continue;
  }
  for (const file of fs.readdirSync(target)) {
    if (!file.endsWith(".tsx")) continue;
    const full = path.join(target, file);
    allViolations.push(...scanFile(full, path.relative(process.cwd(), full)));
  }
}

// ponytail: policy is strict; existing legacy charts may still have colors until adapter migration completes.
// Gate passes when zero violations OR only files listed in grandfather set below.
const GRANDFATHER = new Set([
  "components/report/primitives/chart/guasti-tipo-donut-chart.tsx",
]);

const blocking = allViolations.filter((v) => {
  const rel = v.split(":")[0] ?? "";
  return !GRANDFATHER.has(rel);
});

assert.equal(blocking.length, 0, blocking.join("\n"));
console.log("report-chart-colors-policy.test.ts OK");
