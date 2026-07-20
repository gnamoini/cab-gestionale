import assert from "node:assert/strict";
import { assertValidDrillDownRef } from "@/lib/report/contracts/drill-down-contract";
import { REPORT_SECTIONS } from "@/components/report/report-sections-config";
import { CROSS_P0_METRIC_IDS } from "@/lib/report/cross-analysis/cross-metric-registry";
import { buildInsightRuleContext } from "@/lib/report/insights/insight-input";
import { INSIGHT_RULE_REGISTRY } from "@/lib/report/insights/registry/insight-rule-registry";
import { evaluateInsightRules } from "@/lib/report/insights/engine/evaluate-insight-rules";
import { renderInsightMessage } from "@/lib/report/insights/engine/render-insight-message";
import { tryGetMetricDefinition } from "@/lib/report/metrics/get-metric-definition";
import type { AnalyticsDatasetBundle } from "@/lib/report/analytics/analytics-dataset-bundle";
import { buildReportCrossDto } from "@/lib/report/cross-analysis/build-report-cross-dto";

const RULE_KEY_RE = /^[A-Z][A-Z0-9_]+$/;
const VALID_SECTIONS = new Set(REPORT_SECTIONS.map((s) => s.id));
const CROSS_METRICS = new Set<string>(CROSS_P0_METRIC_IDS);

const emptyBundle: AnalyticsDatasetBundle = {
  datasets: {
    lavorazioni: { metrics: [] },
    magazzino: { metrics: [] },
    economico: { metrics: [], invoicesAvailable: false },
    ore: { metrics: [] },
  },
  metadata: { childMetadata: [], generatedAt: new Date().toISOString() },
};

for (const rule of INSIGHT_RULE_REGISTRY) {
  assert.match(rule.ruleKey, RULE_KEY_RE, `invalid ruleKey: ${rule.ruleKey}`);
  assert.ok(rule.ruleVersion >= 1);
  assert.ok(rule.priority >= 1 && rule.priority <= 30, `priority out of range: ${rule.ruleKey}`);
  assertValidDrillDownRef(rule.drillDown);
  assert.ok(VALID_SECTIONS.has(rule.drillDown.targetSection as never), `${rule.ruleKey} invalid section`);

  for (const metricId of rule.metricIds) {
    const known = tryGetMetricDefinition(metricId) ?? CROSS_METRICS.has(metricId);
    assert.ok(known, `${rule.ruleKey} unknown metricId: ${metricId}`);
  }

  if (rule.severity === "critical") {
    assert.ok(rule.drillDown);
    assert.ok(rule.metricIds.length > 0);
    assert.ok(rule.priority > 0);
  }

  if (rule.applicability === "deferred") {
    const ctx = buildInsightRuleContext({ bundle: emptyBundle, cross: buildReportCrossDto(emptyBundle) });
    const result = rule.evaluate(ctx);
    assert.equal(result.status, "skipped");
    if (result.status === "skipped") {
      assert.equal(result.reason, "deferred");
    }
  } else {
    const message = renderInsightMessage({
      ruleKey: rule.ruleKey,
      ruleVersion: rule.ruleVersion,
      severity: rule.severity,
      priority: rule.priority,
      metricIds: [...rule.metricIds],
      trust: "GREEN",
      payload: {},
    });
    assert.doesNotMatch(message, /^Segnale /, `${rule.ruleKey} missing human message template`);
    assert.doesNotMatch(message, /^Insight /, `${rule.ruleKey} missing human message template`);
  }
}

const ctx = buildInsightRuleContext({ bundle: emptyBundle, cross: buildReportCrossDto(emptyBundle) });
const results = evaluateInsightRules(ctx);
for (const result of results) {
  if (result.status === "skipped") {
    assert.ok(
      ["deferred", "missing_data", "trust_blocked", "condition_false"].includes(result.reason),
      `unknown skip reason: ${result.reason}`,
    );
  }
}

console.log("insight-rule-quality-audit.test.ts OK");
