import assert from "node:assert/strict";
import { mergeBusinessReport } from "@/lib/report/business-report/merge/merge-business-report";
import { hydrateBusinessReportForDisplay } from "@/lib/report/business-report/merge/build-deterministic-executive-summary";
import type { BusinessReportRuntimeContext } from "@/lib/report/business-report/context/build-business-report-context";

const ctx = {
  reportType: "weekly",
  analytics: {
    period: { from: "2026-08-11", to: "2026-08-17" },
    compare: { mode: "previous_period", from: "2026-08-04", to: "2026-08-10" },
    metrics: [],
    series: [],
    trustSummary: { exact: 1, estimated: 0, partial: 0, notAvailable: 0, lowestTrust: "verified" },
  },
  period: { preset: "last_week", compareMode: "previous_period", start: "2026-08-11", end: "2026-08-17" },
  buckets: { highlights: [], concerns: [], anomalies: [] },
  events: [],
  correlations: [],
  insights: [],
} as unknown as BusinessReportRuntimeContext;

const report = mergeBusinessReport({
  runId: "00000000-0000-4000-8000-000000000001",
  logicalReportKey: "weekly:2026-08-11:2026-08-17:previous_period:1:1",
  generationVersion: 1,
  ctx,
  ai: null,
  aiStatus: "unavailable",
  status: "completed",
});

assert.equal(report.aiStatus, "unavailable");
assert.equal(report.status, "completed");
assert.match(report.executiveSummary, /Sintesi automatica/i);

const legacy = hydrateBusinessReportForDisplay({
  ...report,
  executiveSummary:
    "Report basato su metriche certificate e insight deterministici. Interpretazione AI non disponibile.",
});
assert.match(legacy.executiveSummary, /Sintesi automatica/i);
assert.doesNotMatch(legacy.executiveSummary, /non disponibile/i);

console.log("ai-fallback.test.ts OK");
