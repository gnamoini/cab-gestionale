import type { ReportCompareMode as EnvelopeCompareMode } from "@/lib/report/contracts/metadata-envelope";
import type { ReportCompareMode as UiCompareMode } from "@/lib/report/date-ranges";

/** Maps toolbar compare modes to envelope/API compare modes. */
export function mapUiCompareToEnvelope(mode: UiCompareMode): EnvelopeCompareMode {
  if (mode === "prev_period" || mode === "prev_year") return mode;
  return "none";
}
