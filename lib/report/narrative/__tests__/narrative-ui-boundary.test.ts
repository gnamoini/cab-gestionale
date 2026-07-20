import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const FORBIDDEN = [/resolveReportV2NarrativeEnabledClient/, /resolveReportV2NarrativeEnabled\(/, /geminiNarrativeProvider/, /validateNarrativeQuality/];

function collectTsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "__tests__") {
      out.push(...collectTsxFiles(abs));
    } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
      out.push(abs);
    }
  }
  return out;
}

const reportComponents = path.join(process.cwd(), "components/report");
for (const file of collectTsxFiles(reportComponents)) {
  const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
  const src = fs.readFileSync(file, "utf8");
  for (const re of FORBIDDEN) {
    assert.doesNotMatch(src, re, `${rel} must not import ${re}`);
  }
}

const zoneSrc = fs.readFileSync(
  path.join(process.cwd(), "components/report/layout/report-ai-analysis-zone.tsx"),
  "utf8",
);
assert.match(zoneSrc, /useReportAiAnalysisSource/);
assert.doesNotMatch(zoneSrc, /useReportAnalysis\(/);

console.log("narrative-ui-boundary.test.ts OK");
