import type { ReportLavorazioniBundle } from "@/lib/report/lavorazioni-report-selectors";
import { cabDevWarn } from "@/src/lib/observability/dev-warn";

const REPORT_BUNDLE_WARN_SCOPE = "ops.sanity.report_bundle";

/** Warn once per session se bundle report sembra incoerente (non blocca UI). */
export function assertReportBundleSane(
  bundle: ReportLavorazioniBundle,
  lavRowCount: number,
): void {
  if (lavRowCount === 0) return;
  const archivedInSource = bundle.storico.length + bundle.completate.length;
  if (bundle.completate.length > 0 && archivedInSource === 0 && lavRowCount > 5) {
    cabDevWarn(
      REPORT_BUNDLE_WARN_SCOPE,
      "Report bundle: completate presenti ma storico vuoto con molte lavorazioni in lista",
      { lavRowCount, completate: bundle.completate.length },
      { oncePerSession: true },
    );
  }
}
