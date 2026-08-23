import type { ReportCompareMode, ReportPeriodPreset } from "@/lib/report/date-ranges";

export type ReportPeriodUrlState = {
  preset: ReportPeriodPreset;
  compareMode: ReportCompareMode;
  customFrom: string;
  customTo: string;
};

/** Build search params for period deep-link; omits defaults where possible. */
export function buildReportPeriodSearchParams(state: ReportPeriodUrlState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.preset === "custom" && state.customFrom && state.customTo) {
    params.set("from", state.customFrom);
    params.set("to", state.customTo);
  }
  if (state.compareMode !== "none") {
    params.set("compare", state.compareMode);
  }
  return params;
}

export function mergeReportPeriodIntoPath(pathname: string, state: ReportPeriodUrlState): string {
  const params = buildReportPeriodSearchParams(state);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
