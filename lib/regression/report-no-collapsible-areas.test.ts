import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "components", "report", "areas");
const FORBIDDEN = [
  "defaultCollapsed",
  "collapsible",
  "ReportAnalysisSectionShell",
  "ShellCard",
  "ReportSubsection",
  "persistKey=",
];

const LAYOUT_COMPOSERS = [
  "ReportLayoutKpiStrip",
  "ReportLayoutMainAside",
  "ReportLayoutSplit",
  "ReportLayoutDetail",
  "ReportLayoutRow",
];

const files = fs.readdirSync(ROOT).filter((f) => f.startsWith("report-area-") && f.endsWith(".tsx"));

for (const file of files) {
  const content = fs.readFileSync(path.join(ROOT, file), "utf8");
  for (const token of FORBIDDEN) {
    assert.equal(
      content.includes(token),
      false,
      `${file} must not contain "${token}" — area views must be flat narrative`,
    );
  }
  assert.ok(content.includes("ReportStorySection"), `${file} must use ReportStorySection`);
  assert.ok(
    LAYOUT_COMPOSERS.some((c) => content.includes(c)),
    `${file} must use at least one ReportLayout* composer`,
  );
  assert.ok(content.includes("getReportStoryCopy"), `${file} must use getReportStoryCopy for narrative titles`);
}

console.log("report-no-collapsible-areas.test.ts OK");
