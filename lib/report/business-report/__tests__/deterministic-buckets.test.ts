import assert from "node:assert/strict";
import { buildDeterministicInsightBuckets } from "@/lib/report/business-report/classification/build-deterministic-insight-buckets";
import type { InsightDto } from "@/lib/report/insights/types";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";

const insight: InsightDto = {
  id: "LAV_OPEN_BACKLOG",
  ruleKey: "LAV_OPEN_BACKLOG",
  ruleVersion: 1,
  message: "Backlog elevato",
  severity: "warning",
  priority: 1,
  metricIds: ["lav-aperti"],
  drillDown: { metricId: "lav-aperti", targetSection: "lavorazioni" },
  trust: "AMBER",
};

const env: ReportMetricEnvelope = {
  metricId: "lav-aperti",
  metric: {
    id: "lav-aperti",
    label: "Aperti",
    value: 12,
    compare: {
      status: "available" as const,
      previousValue: 10,
      deltaAbs: 2,
      deltaPercent: 21,
    },
  },
  period: { from: "2026-08-11", to: "2026-08-17" },
  unit: "count",
  semantics: "snapshot",
  trust: "verified",
  formulaId: "lav-aperti",
} as unknown as ReportMetricEnvelope;

const buckets = buildDeterministicInsightBuckets([insight], new Map([["lav-aperti", env]]));
assert.ok(buckets.concerns.length + buckets.anomalies.length >= 1);

console.log("deterministic-buckets.test.ts OK");
