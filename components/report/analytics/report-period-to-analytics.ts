import { ymdFromDate, type ReportCompareMode as UiCompareMode } from "@/lib/report/date-ranges";
import type {
  ReportCompareMode,
  ReportRequestedPeriod,
} from "@/lib/report/contracts/metadata-envelope";
import type { ReportPeriodContextValue } from "@/components/report/context/report-period-context";

function mapCompareMode(mode: UiCompareMode): ReportCompareMode {
  if (mode === "prev_period" || mode === "prev_year") return mode;
  return "none";
}

/** Maps toolbar context → analytics API period (custom from/to SSOT). */
export function buildAnalyticsPeriodFromContext(
  ctx: Pick<ReportPeriodContextValue, "range" | "compareMode">,
): ReportRequestedPeriod {
  return {
    preset: "custom",
    start: ymdFromDate(ctx.range.start),
    end: ymdFromDate(ctx.range.end),
    compareMode: mapCompareMode(ctx.compareMode),
  };
}
