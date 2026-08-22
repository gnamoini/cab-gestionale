import assert from "node:assert/strict";
import { validateBusinessReportTrust } from "@/lib/report/business-report/validation/validate-business-report-trust";
import type { BusinessReportRuntimeContext } from "@/lib/report/business-report/context/build-business-report-context";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";

const estimatedMargin: ReportMetricEnvelope = {
  metricId: "eco_margine_operativo_stimato",
  metric: {
    id: "eco_margine_operativo_stimato",
    label: "Margine stimato",
    value: 12_000,
    compare: null,
  },
  period: { from: "2026-08-01", to: "2026-08-31" },
  unit: "currency",
  semantics: "flow",
  trust: "estimated",
  formulaId: "eco_margine_operativo_stimato",
} as unknown as ReportMetricEnvelope;

const ctx = {
  analytics: { metrics: [estimatedMargin] },
  envelopesById: new Map([["eco_margine_operativo_stimato", estimatedMargin]]),
  insights: [],
} as unknown as BusinessReportRuntimeContext;

const drift = validateBusinessReportTrust(
  {
    executiveSummary: "Il margine reale è in crescita.",
    highlightExplanations: [],
    concernExplanations: [],
    anomalyExplanations: [],
    decisions: [],
  },
  ctx,
);
assert.equal(drift.ok, false);

console.log("validate-business-report-trust.test.ts OK");
