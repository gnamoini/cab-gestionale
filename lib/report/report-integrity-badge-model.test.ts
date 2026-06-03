import assert from "node:assert/strict";
import {
  buildReportIntegrityTooltipLines,
  deriveReportIntegrityBadgeState,
  reportIntegrityBadgeLabel,
  type ReportIntegrityBadgeView,
} from "@/lib/report/report-integrity-badge-model";

const baseView: ReportIntegrityBadgeView = {
  status: "ok",
  audit: { findings: [], strictBlocked: false },
  queryMeta: [
    {
      source: "lavorazioni",
      isError: false,
      isFetching: false,
      dataUpdatedAt: 1_700_000_000_000,
      rowCount: 10,
    },
  ],
  manualEntryCount: 0,
};

assert.equal(deriveReportIntegrityBadgeState(baseView), "ok");
assert.equal(reportIntegrityBadgeLabel("ok"), "OK");

assert.equal(
  deriveReportIntegrityBadgeState({
    ...baseView,
    audit: {
      findings: [{ code: "cache_drift", severity: "warning", count: 130_000, message: "drift" }],
      strictBlocked: false,
    },
  }),
  "drift_detected",
);

assert.equal(
  deriveReportIntegrityBadgeState({
    ...baseView,
    queryMeta: [{ source: "magazzino", isError: true, isFetching: false, dataUpdatedAt: 0, rowCount: 0 }],
    audit: {
      findings: [{ code: "query_error", severity: "warning", message: "Query magazzino in errore" }],
      strictBlocked: false,
    },
  }),
  "partial",
);

const lines = buildReportIntegrityTooltipLines({
  ...baseView,
  manualEntryCount: 2,
});
assert.ok(lines.some((l) => l.includes("Override attivi: 2")));
assert.ok(lines.some((l) => l.includes("Drift rilevato: no")));

console.log("report-integrity-badge-model.test.ts OK");
