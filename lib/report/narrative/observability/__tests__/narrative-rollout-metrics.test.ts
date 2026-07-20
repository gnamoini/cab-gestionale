import assert from "node:assert/strict";
import {
  buildNarrativeRolloutMetrics,
  buildReportAnalysisRolloutMetrics,
} from "@/lib/report/narrative/observability/narrative-rollout-metrics";
import type {
  ReportMetricObservabilityEvent,
  ReportMetricObservation,
} from "@/lib/report/observability/report-metric-observability";

type ObservedEvent = {
  event: ReportMetricObservabilityEvent;
  payload: ReportMetricObservation;
};

const legacyEvents: ObservedEvent[] = [
  {
    event: "report_analysis_completed",
    payload: { metricId: "report_analysis", consumerPath: "legacy-analysis", executionTimeMs: 100 },
  },
  {
    event: "report_analysis_completed",
    payload: { metricId: "report_analysis", consumerPath: "legacy-analysis", executionTimeMs: 200 },
  },
  {
    event: "report_analysis_failed",
    payload: { metricId: "report_analysis", consumerPath: "legacy-analysis", message: "timeout" },
  },
  { event: "report_analysis_empty", payload: { metricId: "report_analysis", consumerPath: "legacy-analysis" } },
];

const legacy = buildReportAnalysisRolloutMetrics(legacyEvents);
assert.equal(legacy.sampleCount, 4);
assert.equal(legacy.latencyP95, 200);
assert.equal(legacy.errorRate, 0.25);
assert.equal(legacy.emptyRate, 0.25);

const narrativeEvents: ObservedEvent[] = [
  {
    event: "narrative_generation_completed",
    payload: {
      metricId: "narrative_generation",
      consumerPath: "narrative-v2",
      executionTimeMs: 400,
      tenantResolved: true,
    },
  },
  {
    event: "narrative_generation_completed",
    payload: {
      metricId: "narrative_generation",
      consumerPath: "narrative-v2",
      executionTimeMs: 500,
      tenantResolved: false,
    },
  },
  {
    event: "narrative_quality_failed",
    payload: { metricId: "narrative_generation", consumerPath: "narrative-v2", message: "quality_failed" },
  },
  {
    event: "narrative_consumed",
    payload: { metricId: "narrative_generation", consumerPath: "narrative-v2", tenantResolved: true },
  },
];

const narrative = buildNarrativeRolloutMetrics(narrativeEvents);
assert.equal(narrative.latencyP95, 500);
assert.equal(narrative.qualityFailRate, 1 / 3);
assert.equal(narrative.tenantUnresolvedRate, 1 / 3);
assert.equal(narrative.byFailureCode.quality_failed, 1);

console.log("narrative-rollout-metrics.test.ts OK");
