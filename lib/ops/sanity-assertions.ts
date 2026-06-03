import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { ReportTruthDataset } from "@/lib/report/report-truth-dataset";
import type { ReportLavorazioniBundle } from "@/lib/report/lavorazioni-report-selectors";
import { ReportIntegrityAudit } from "@/lib/report/report-integrity-audit";

/** @deprecated Usare `ReportIntegrityAudit` via `ReportDataIntegrityLayer`. */
export function assertReportBundleSane(
  bundle: ReportLavorazioniBundle,
  lavRowCount: number,
): void {
  const stub: ReportTruthDataset = {
    ...bundle,
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
  };
  void lavRowCount;
  ReportIntegrityAudit.emitDevWarnings(ReportIntegrityAudit.run(stub));
}

/** @deprecated Coperto da `ReportIntegrityAudit.run`. */
export function assertReportMagLogSane(
  _magLog: readonly MagazzinoChangeLogEntry[],
  _validRicambioIds: ReadonlySet<string>,
): void {
  /* no-op — audit integrato nel layer */
}

/** @deprecated Usare `ReportDataIntegrityLayer.buildValidatedDataset`. */
export function assertReportTruthDatasetSane(dataset: ReportTruthDataset): void {
  ReportIntegrityAudit.emitDevWarnings(ReportIntegrityAudit.run(dataset));
}
