import assert from "node:assert/strict";
import { resolveChartLayout } from "@/lib/report/ui/report-layout-rules";
import { formatReportCompareLine, formatReportDeltaPercent } from "@/lib/report/ui/report-number-format";
import { buildReportDataInsight } from "@/lib/report/ui/report-data-insight";

const compact = resolveChartLayout({ chartType: "line", pointCount: 4 });
assert.equal(compact.size, "compact");
assert.equal(compact.suggestSidePanel, true);

const wide = resolveChartLayout({ chartType: "horizontalBar", categoryCount: 12 });
assert.equal(wide.size, "wide");

assert.equal(formatReportCompareLine(14.2), "+14,2% rispetto al periodo precedente");
assert.equal(formatReportDeltaPercent(-3), "-3%");

const insight = buildReportDataInsight({
  metricLabel: "Lavorazioni completate",
  value: 128,
  previousValue: 112,
  deltaPercent: 14.3,
  trend: "up",
});
assert.ok(insight?.includes("14,3%"));

console.log("report-analytics-ui-ssot.test.ts OK");
