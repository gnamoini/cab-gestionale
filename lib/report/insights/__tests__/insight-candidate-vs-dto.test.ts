import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildReportInsightsDto } from "@/lib/report/insights/builders/build-report-insights-dto";
import { evaluateInsightRules } from "@/lib/report/insights/engine/evaluate-insight-rules";
import { enrichInsightDto } from "@/lib/report/insights/engine/enrich-insight-dto";
import { renderInsightMessage } from "@/lib/report/insights/engine/render-insight-message";
import { buildInsightRuleContext } from "@/lib/report/insights/insight-input";
import { INSIGHT_RULE_REGISTRY } from "@/lib/report/insights/registry/insight-rule-registry";
import type { AnalyticsDatasetBundle } from "@/lib/report/analytics/analytics-dataset-bundle";
import { buildReportCrossDto } from "@/lib/report/cross-analysis/build-report-cross-dto";

const RULE_FILES = [
  "lib/report/insights/rules/lavorazioni.rules.ts",
  "lib/report/insights/rules/magazzino.rules.ts",
  "lib/report/insights/rules/ore.rules.ts",
  "lib/report/insights/rules/economico.rules.ts",
  "lib/report/insights/rules/cross.rules.ts",
  "lib/report/insights/rules/compliance.rules.ts",
];

for (const rel of RULE_FILES) {
  const src = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
  assert.doesNotMatch(src, /render-insight-message/, `${rel} must not import render layer`);
}

const bundle: AnalyticsDatasetBundle = {
  datasets: {
    lavorazioni: {
      metrics: [
        { id: "lav-periodo", value: 10, label: "" },
        { id: "lav-chiusi", value: 3, label: "" },
        { id: "lav-aperti", value: 5, label: "" },
        { id: "lav-tempo", value: 20, label: "" },
        { id: "lav_late_sla", value: 2, label: "" },
      ],
    },
    magazzino: { metrics: [] },
    economico: { metrics: [], invoicesAvailable: false },
    ore: { metrics: [] },
  },
  metadata: { childMetadata: [], generatedAt: new Date().toISOString() },
};

const cross = buildReportCrossDto(bundle);
const ctx = buildInsightRuleContext({ bundle, cross });
const results = evaluateInsightRules(ctx);

for (const result of results) {
  if (result.status === "fired") {
    assert.equal("message" in result.candidate, false);
    assert.equal("drillDown" in result.candidate, false);
  }
}

const { dto } = buildReportInsightsDto({ bundle, cross });
for (const insight of dto.insights) {
  assert.ok(insight.message.length > 0);
  assert.ok(insight.drillDown);
}

const fired = results.find((r) => r.status === "fired");
if (fired?.status === "fired") {
  const enriched = enrichInsightDto(fired.candidate);
  assert.ok(enriched);
  assert.equal("message" in enriched, false);
  const message = renderInsightMessage(fired.candidate);
  assert.ok(message.length > 0);
}

assert.ok(INSIGHT_RULE_REGISTRY.length > 0);

console.log("insight-candidate-vs-dto.test.ts OK");
