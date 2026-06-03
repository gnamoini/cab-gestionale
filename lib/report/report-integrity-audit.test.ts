import assert from "node:assert/strict";
import type { ReportTruthDataset } from "@/lib/report/report-truth-dataset";
import {
  ReportIntegrityAudit,
  runReportIntegrityAudit,
  isReportIntegrityStrictMode,
} from "@/lib/report/report-integrity-audit";

function stubDataset(over: Partial<ReportTruthDataset> = {}): ReportTruthDataset {
  return {
    attive: [],
    storico: [],
    completate: [],
    magazzino: [],
    mezzi: [],
    manualEntries: [],
    manualByMonth: new Map(),
    magLog: [],
    validRicambioIds: new Set(["r1"]),
    validLavorazioneIds: new Set(),
    validMezzoIds: new Set(),
    movimentiExcludedCount: 0,
    lavorazioniExcludedCount: 0,
    ...over,
  };
}

const orphanReport = runReportIntegrityAudit(
  stubDataset({
    magLog: [
      {
        id: "x",
        tipo: "update",
        ricambioId: "ghost",
        ricambio: "",
        autore: "t",
        at: "2025-01-01T00:00:00.000Z",
        riepilogo: "",
        changes: [],
        annullato: false,
      },
    ],
  }),
);
assert.ok(orphanReport.findings.some((f) => f.code === "orphan_ricambio" && f.severity === "critical"));

const strictReport = runReportIntegrityAudit(
  stubDataset({
    magLog: [
      {
        id: "x",
        tipo: "update",
        ricambioId: "ghost",
        ricambio: "",
        autore: "t",
        at: "2025-01-01T00:00:00.000Z",
        riepilogo: "",
        changes: [],
        annullato: false,
      },
    ],
  }),
  { strict: true },
);
assert.equal(strictReport.strictBlocked, true);

const driftReport = runReportIntegrityAudit(stubDataset(), {
  extraFindings: [
    {
      code: "cache_drift",
      severity: "warning",
      count: 150_000,
      message: "drift test",
    },
  ],
});
assert.ok(driftReport.findings.some((f) => f.code === "cache_drift"));

void isReportIntegrityStrictMode;
void ReportIntegrityAudit;

console.log("report-integrity-audit.test.ts OK");
