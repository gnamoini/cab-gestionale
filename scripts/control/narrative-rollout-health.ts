#!/usr/bin/env npx tsx
/**
 * Read-only narrative rollout health check (observe tier).
 * Does not mutate env — reports threshold breaches on synthetic or drained metrics.
 */
import {
  buildNarrativeRolloutMetrics,
  buildReportAnalysisRolloutMetrics,
} from "@/lib/report/narrative/observability/narrative-rollout-metrics";
import { reportMetricObserver } from "@/lib/report/observability/report-metric-observability";

const ERROR_RATE_THRESHOLD = 0.25;
const NARRATIVE_VS_LEGACY_ERROR_DELTA = 0.05;

const events = reportMetricObserver.drain();
const legacy = buildReportAnalysisRolloutMetrics(events);
const narrative = buildNarrativeRolloutMetrics(events);

const violations: string[] = [];

if (narrative.sampleCount > 0 && narrative.errorRate > ERROR_RATE_THRESHOLD) {
  violations.push(`narrative error rate ${narrative.errorRate} > ${ERROR_RATE_THRESHOLD}`);
}

if (
  legacy.sampleCount > 0 &&
  narrative.sampleCount > 0 &&
  narrative.errorRate > legacy.errorRate + NARRATIVE_VS_LEGACY_ERROR_DELTA
) {
  violations.push(
    `narrative error rate ${narrative.errorRate} exceeds legacy baseline ${legacy.errorRate} + ${NARRATIVE_VS_LEGACY_ERROR_DELTA}`,
  );
}

if (violations.length > 0) {
  console.error("narrative-rollout-health: FAIL");
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log("narrative-rollout-health: OK", {
  legacySamples: legacy.sampleCount,
  narrativeSamples: narrative.sampleCount,
});
