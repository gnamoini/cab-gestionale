import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { REPORT_FORBIDDEN_TITLE_TERMS } from "@/lib/report/ui/report-copy";

const SCAN_FILES = [
  "components/report/bi-center/report-clienti-section.tsx",
  "components/report/bi-center/report-preventivi-content.tsx",
  "components/report/bi-center/report-economia-charts-panel.tsx",
  "components/report/bi-center/advanced/report-cross-metrics-section.tsx",
  "components/report/bi-center/advanced/report-cross-catena-section.tsx",
  "components/report/bi-center/advanced/report-cross-trend-section.tsx",
  "components/report/bi-center/operational/report-operational-context-panel.tsx",
  "components/report/bi-center/operational/report-timeline-v2.tsx",
  "components/report/primitives/chart/preventivi-funnel-chart.tsx",
];

const TITLE_PATTERNS = [
  /title=["']([^"']+)["']/g,
  /title=\{["']([^"']+)["']\}/g,
];

for (const rel of SCAN_FILES) {
  const content = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
  for (const pattern of TITLE_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const title = match[1]!;
      for (const term of REPORT_FORBIDDEN_TITLE_TERMS) {
        assert.equal(
          title.toLowerCase().includes(term.toLowerCase()),
          false,
          `${rel}: title "${title}" contains forbidden term "${term}"`,
        );
      }
    }
  }
}

console.log("report-forbidden-ui-terms.test.ts OK");
