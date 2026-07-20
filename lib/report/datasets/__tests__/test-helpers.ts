import type { ReportIntegrityResult } from "@/lib/report/report-data-integrity-layer";
import type { ReportDatasetSlices } from "@/lib/report/datasets/builders/shared";
import { resolvePresetRange, ymdFromDate } from "@/lib/report/date-ranges";
import { buildReportRangeKey } from "@/lib/report/report-domain-types";

export function emptyIntegrityResult(): ReportIntegrityResult {
  return {
    attive: [],
    storico: [],
    completate: [],
    magazzino: [],
    mezzi: [],
    manualEntries: [],
    manualByMonth: new Map(),
    magLog: [],
    validRicambioIds: new Set(),
    validLavorazioneIds: new Set(),
    validMezzoIds: new Set(),
    movimentiExcludedCount: 0,
    lavorazioniExcludedCount: 0,
    status: "ok",
    audit: { findings: [], strictBlocked: false },
  };
}

export function minimalDatasetSlices(overrides?: Partial<ReportDatasetSlices>): ReportDatasetSlices {
  const anchor = new Date();
  const range = resolvePresetRange(anchor, "current_month");
  const integrity = overrides?.integrity ?? emptyIntegrityResult();
  return {
    integrity,
    lavRows: [],
    magazzinoRows: [],
    range,
    compareRange: null,
    compareMode: "none",
    rangeKey: buildReportRangeKey(range, null),
    ...overrides,
  };
}
