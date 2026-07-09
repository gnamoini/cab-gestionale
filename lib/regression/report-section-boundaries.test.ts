import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SECTIONS_DIR = path.join(ROOT, "components/report/sections");

const SECTION_FILES = [
  "report-ai-section.tsx",
  "report-lavorazioni-section.tsx",
  "report-magazzino-section.tsx",
  "report-ore-section.tsx",
  "report-economici-section.tsx",
  "report-cross-section.tsx",
] as const;

const PUBLISH_ALLOWLIST: Record<string, readonly string[]> = {
  "report-lavorazioni-section.tsx": ["publishOperationalAnalytics"],
  "report-magazzino-section.tsx": ["publishWarehouseAnalytics"],
  "report-ore-section.tsx": ["publishLaborAnalytics"],
  "report-economici-section.tsx": ["publishEconomicAnalytics"],
  "report-cross-section.tsx": [],
  "report-ai-section.tsx": [],
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

for (const file of SECTION_FILES) {
  const text = readSection(file);
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
console.log("report-section-boundaries.test.ts OK");
