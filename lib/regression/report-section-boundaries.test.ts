import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SECTIONS_DIR = path.join(ROOT, "components/report/sections");

const SECTION_FILES = [
  "report-ai-section.tsx",
  "report-lavorazioni-section.tsx",
  "report-clienti-mezzi-section.tsx",
  "report-magazzino-section.tsx",
  "report-ore-section.tsx",
  "report-economici-section.tsx",
  "report-cross-section.tsx",
  "report-kpi-charts-section.tsx",
] as const;

const PUBLISH_ALLOWLIST: Record<string, readonly string[]> = {
  "report-lavorazioni-section.tsx": ["publishOperationalAnalytics"],
  "report-clienti-mezzi-section.tsx": [],
  "report-magazzino-section.tsx": ["publishWarehouseAnalytics"],
  "report-ore-section.tsx": ["publishLaborAnalytics"],
  "report-economici-section.tsx": ["publishEconomicAnalytics"],
  "report-cross-section.tsx": [],
  "report-ai-section.tsx": [],
  "report-kpi-charts-section.tsx": [],
};

const ALL_PUBLISH = [
  "publishOperationalAnalytics",
  "publishWarehouseAnalytics",
  "publishLaborAnalytics",
  "publishEconomicAnalytics",
] as const;

function readSection(file: string): string {
  return fs.readFileSync(path.join(SECTIONS_DIR, file), "utf8");
}

const violations: string[] = [];

const SUBSECTION_IN_LAYOUT: Partial<Record<(typeof SECTION_FILES)[number], string>> = {
  "report-ai-section.tsx": "components/report/layout/report-ai-analysis-zone.tsx",
};

for (const file of SECTION_FILES) {
  const text = readSection(file);
  const subsectionSource = SUBSECTION_IN_LAYOUT[file]
    ? fs.readFileSync(path.join(ROOT, SUBSECTION_IN_LAYOUT[file]!), "utf8")
    : text;
  assert.match(
    subsectionSource,
    /ReportSubsection|ReportSection/,
    `${file}: must use ReportSubsection or ReportSection for internal blocks`,
  );
  const allowed = PUBLISH_ALLOWLIST[file] ?? [];

  for (const other of SECTION_FILES) {
    if (other === file) continue;
    const importNeedle = `sections/${other.replace(".tsx", "")}`;
    if (text.includes(importNeedle)) {
      violations.push(`${file}: imports sibling section ${other}`);
    }
  }

  for (const publish of ALL_PUBLISH) {
    if (!text.includes(publish)) continue;
    if (!allowed.includes(publish)) {
      violations.push(`${file}: forbidden publish call ${publish}`);
    }
  }

  if (file === "report-ai-section.tsx" || file === "report-cross-section.tsx") {
    if (text.includes("useReportAnalyticsDerivedActions")) {
      violations.push(`${file}: must not use useReportAnalyticsDerivedActions`);
    }
  }

  if (file === "report-ai-section.tsx") {
    if (text.includes("useReportAnalyticsDerived")) {
      violations.push(`${file}: must not use useReportAnalyticsDerived`);
    }
  }
}

assert.equal(violations.length, 0, violations.join("\n"));

const aiZone = fs.readFileSync(path.join(ROOT, "components/report/layout/report-ai-analysis-zone.tsx"), "utf8");
assert.match(aiZone, /report-performance-context/);
assert.doesNotMatch(aiZone, /from "@\/components\/report\/layout\/report-performance-gate"/);

console.log("report-section-boundaries.test.ts OK");
