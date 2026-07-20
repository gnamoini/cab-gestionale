import assert from "node:assert/strict";
import { buildInsightSignals } from "@/lib/report/insights/insight-input";
import type { AnalyticsDatasetBundle } from "@/lib/report/analytics/analytics-dataset-bundle";
import type { ReportCrossDto } from "@/lib/report/cross-analysis/types";
import { CROSS_CONTRACT_VERSION } from "@/lib/report/cross-analysis/types";

const emptyBundle = {
  datasets: {
    lavorazioni: { metrics: [] },
    magazzino: { metrics: [] },
    economico: { metrics: [], invoicesAvailable: false },
    ore: { metrics: [] },
  },
  metadata: { childMetadata: [] },
} as unknown as AnalyticsDatasetBundle;

const emptyCross: ReportCrossDto = {
  contractVersion: CROSS_CONTRACT_VERSION,
  metrics: [],
  metadata: {} as never,
};

const signals = buildInsightSignals(emptyBundle, emptyCross, {
  complianceCounts: { overdue: 2, due30d: 5 },
});
assert.equal(signals.cross.get("compliance_overdue")?.value, 2);
assert.equal(signals.cross.get("compliance_due_30d")?.value, 5);
