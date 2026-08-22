import assert from "node:assert/strict";
import { validateBusinessReportClaims } from "@/lib/report/business-report/validation/validate-business-report-claims";
import type { BusinessReportRuntimeContext } from "@/lib/report/business-report/context/build-business-report-context";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";

const env: ReportMetricEnvelope = {
  metricId: "eco_fatturato",
  metric: {
    id: "eco_fatturato",
    label: "Fatturato",
    value: 100_000,
    compare: {
      status: "available" as const,
      previousValue: 90_000,
      deltaAbs: 10_000,
      deltaPercent: 10,
    },
  },
  period: { from: "2026-08-01", to: "2026-08-31" },
  unit: "currency",
  semantics: "flow",
  trust: "verified",
  formulaId: "eco_fatturato",
} as unknown as ReportMetricEnvelope;

const ctx = {
  analytics: { metrics: [env] },
  envelopesById: new Map([["eco_fatturato", env]]),
  insights: [],
} as unknown as BusinessReportRuntimeContext;

const badDirection = validateBusinessReportClaims(
  {
    executiveSummary: "Il fatturato eco_fatturato è in calo significativo nel periodo.",
    highlightExplanations: [],
    concernExplanations: [],
    anomalyExplanations: [],
    decisions: [],
  },
  ctx,
);
assert.equal(badDirection.ok, false);

const causal = validateBusinessReportClaims(
  {
    executiveSummary: "La disponibilità ricambi ha causato il backlog.",
    highlightExplanations: [],
    concernExplanations: [],
    anomalyExplanations: [],
    decisions: [],
  },
  ctx,
);
assert.equal(causal.ok, false);

const numericValid = validateBusinessReportClaims(
  {
    executiveSummary: "Il fatturato è pari a 100000 euro nel periodo.",
    highlightExplanations: [],
    concernExplanations: [],
    anomalyExplanations: [],
    decisions: [],
  },
  ctx,
);
assert.equal(numericValid.ok, true);

const entity = validateBusinessReportClaims(
  {
    executiveSummary: "Il cliente ACME SpA ha ridotto gli ordini.",
    highlightExplanations: [],
    concernExplanations: [],
    anomalyExplanations: [],
    decisions: [],
  },
  ctx,
);
assert.equal(entity.ok, false);

const comparison = validateBusinessReportClaims(
  {
    executiveSummary: "Il fatturato è superiore rispetto al periodo precedente.",
    highlightExplanations: [],
    concernExplanations: [],
    anomalyExplanations: [],
    decisions: [],
  },
  ctx,
);
assert.equal(comparison.ok, true);

const directionalValid = validateBusinessReportClaims(
  {
    executiveSummary: "Il fatturato eco_fatturato è migliorato nel periodo.",
    highlightExplanations: [],
    concernExplanations: [],
    anomalyExplanations: [],
    decisions: [],
  },
  ctx,
);
assert.equal(directionalValid.ok, true);

console.log("claim-validation.test.ts OK");
