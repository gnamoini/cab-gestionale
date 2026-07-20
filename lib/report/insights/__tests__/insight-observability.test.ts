import assert from "node:assert/strict";
import { reportMetricObserver } from "@/lib/report/observability/report-metric-observability";
import { evaluateInsightRules } from "@/lib/report/insights/engine/evaluate-insight-rules";
import { buildInsightRuleContext } from "@/lib/report/insights/insight-input";
import type { AnalyticsDatasetBundle } from "@/lib/report/analytics/analytics-dataset-bundle";
import { buildReportCrossDto } from "@/lib/report/cross-analysis/build-report-cross-dto";

reportMetricObserver.drain();

const bundle: AnalyticsDatasetBundle = {
  datasets: {
    lavorazioni: { metrics: [] },
    magazzino: { metrics: [] },
    economico: { metrics: [], invoicesAvailable: false },
    ore: { metrics: [] },
  },
  metadata: { childMetadata: [], generatedAt: new Date().toISOString() },
};

const cross = buildReportCrossDto(bundle);
const ctx = buildInsightRuleContext({ bundle, cross });
evaluateInsightRules(ctx);

const events = reportMetricObserver.drain();
const skipped = events.filter((e) => e.event === "insight_rule_skipped");
assert.ok(skipped.length > 0);
assert.ok(skipped.every((e) => e.payload.ruleKey && e.payload.ruleVersion != null));

console.log("insight-observability.test.ts OK");
