import type {
  ReportCompareMode as ContractCompareMode,
  ReportPeriodPreset as ContractPeriodPreset,
  ReportRequestedPeriod,
} from "@/lib/report/contracts/metadata-envelope";
import {
  resolvePresetRange,
  resolveReportCompareRange,
  ymdFromDate,
  type DateRange,
  type ReportCompareMode,
  type ReportPeriodPreset,
} from "@/lib/report/date-ranges";

const CONTRACT_TO_DATE_PRESET: Record<ContractPeriodPreset, ReportPeriodPreset> = {
  questo_mese: "current_month",
  mese_scorso: "last_month",
  questo_trimestre: "current_quarter",
  anno_corrente: "ytd",
  custom: "custom",
};

const CONTRACT_TO_COMPARE: Record<ContractCompareMode, ReportCompareMode> = {
  none: "none",
  prev_period: "prev_period",
  prev_year: "prev_year",
};

const DATE_COMPARE_MODES: readonly ReportCompareMode[] = [
  "none",
  "prev_year",
  "prev_period",
  "avg_3_months",
  "avg_12_months",
  "avg_3_years",
  "custom_range",
];

function resolveDatePreset(preset: ReportRequestedPeriod["preset"] | string): ReportPeriodPreset {
  const mapped = CONTRACT_TO_DATE_PRESET[preset as ContractPeriodPreset];
  if (mapped) return mapped;
  return (preset as ReportPeriodPreset) || "current_month";
}

function resolveCompareMode(mode: ReportRequestedPeriod["compareMode"] | string): ReportCompareMode {
  const mapped = CONTRACT_TO_COMPARE[mode as ContractCompareMode];
  if (mapped) return mapped;
  if ((DATE_COMPARE_MODES as readonly string[]).includes(mode)) {
    return mode as ReportCompareMode;
  }
  return "none";
}

export function contractPresetToDatePreset(preset: ContractPeriodPreset): ReportPeriodPreset {
  return CONTRACT_TO_DATE_PRESET[preset];
}

export function contractCompareToDateCompare(mode: ContractCompareMode): ReportCompareMode {
  return CONTRACT_TO_COMPARE[mode];
}

export function resolveDatasetDateRanges(input: {
  anchor?: Date;
  period: ReportRequestedPeriod;
}): { range: DateRange; compareRange: DateRange | null; compareMode: ReportCompareMode } {
  const anchor = input.anchor ?? new Date();
  const datePreset = resolveDatePreset(input.period.preset);
  const compareMode = resolveCompareMode(input.period.compareMode);
  const hasCustomBounds = Boolean(input.period.start?.trim() && input.period.end?.trim());
  const range = hasCustomBounds
    ? resolvePresetRange(anchor, "custom", input.period.start, input.period.end)
    : resolvePresetRange(anchor, datePreset, input.period.start, input.period.end);
  const compareRange =
    compareMode === "none"
      ? null
      : resolveReportCompareRange(range, compareMode);
  return { range, compareRange, compareMode };
}

export function defaultRequestedPeriod(anchor = new Date()): ReportRequestedPeriod {
  const range = resolvePresetRange(anchor, "current_month");
  return {
    preset: "questo_mese",
    start: ymdFromDate(range.start),
    end: ymdFromDate(range.end),
    compareMode: "none",
  };
}
