import assert from "node:assert/strict";
import { INSIGHT_SKIP_REASONS } from "@/lib/report/insights/types";
import { evaluateInsightRules } from "@/lib/report/insights/engine/evaluate-insight-rules";
import { buildInsightRuleContext } from "@/lib/report/insights/insight-input";
import type { AnalyticsDatasetBundle } from "@/lib/report/analytics/analytics-dataset-bundle";
import { buildReportCrossDto } from "@/lib/report/cross-analysis/build-report-cross-dto";

const bundle: AnalyticsDatasetBundle = {
  datasets: {
    lavorazioni: { metrics: [] },
    magazzino: { metrics: [] },
    economico: { metrics: [], invoicesAvailable: false },
    ore: { metrics: [] },
  },
  metadata: { childMetadata: [], generatedAt: new Date().toISOString() },
};

const ctx = buildInsightRuleContext({ bundle, cross: buildReportCrossDto(bundle) });
const results = evaluateInsightRules(ctx);

const seen = new Set<string>();
for (const result of results) {
  if (result.status === "skipped") {
    seen.add(result.reason);
    assert.ok(
      (INSIGHT_SKIP_REASONS as readonly string[]).includes(result.reason),
      `skip reason not in union: ${result.reason}`,
    );
  }
}

assert.ok(seen.size > 0, "expected at least one skip reason in fixture");

console.log("insight-skip-reason-exhaustiveness.test.ts OK");
