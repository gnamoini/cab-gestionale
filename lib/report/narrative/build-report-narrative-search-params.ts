import type { ReportCompareMode, ReportPeriodPreset } from "@/lib/report/date-ranges";
import type { DateRange } from "@/lib/report/date-ranges";
import { ymdFromDate } from "@/lib/report/date-ranges";

export function buildReportNarrativeSearchParams(input: {
  preset: ReportPeriodPreset;
  compareMode: ReportCompareMode;
  filterRange: DateRange;
}): URLSearchParams {
  const params = new URLSearchParams();
  params.set("preset", input.preset);
  params.set("compareMode", input.compareMode);
  params.set("from", ymdFromDate(input.filterRange.start));
  params.set("to", ymdFromDate(input.filterRange.end));
  return params;
}
