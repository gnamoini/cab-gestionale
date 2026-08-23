import type { ReportCompareMode, ReportPeriodPreset } from "@/lib/report/date-ranges";
import { isReportCompareMode } from "@/lib/report/report-compare-options";
import { loadReportPeriodPrefs } from "@/lib/report/report-period-persistence";

export type ReportPeriodInitPrefs = {
  preset: ReportPeriodPreset;
  compareMode: ReportCompareMode;
  customFrom: string;
  customTo: string;
  compareCustomFrom: string;
  compareCustomTo: string;
};

export function readInitialReportPeriodPrefs(searchParams: URLSearchParams | null): ReportPeriodInitPrefs {
  const defaults: ReportPeriodInitPrefs = {
    preset: "last_3_months",
    compareMode: "none",
    customFrom: "",
    customTo: "",
    compareCustomFrom: "",
    compareCustomTo: "",
  };

  const fromUrl = searchParams?.get("from")?.trim() ?? "";
  const toUrl = searchParams?.get("to")?.trim() ?? "";
  const presetUrl = searchParams?.get("preset")?.trim() ?? "";
  const compareUrl = searchParams?.get("compare")?.trim() ?? "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(fromUrl) && /^\d{4}-\d{2}-\d{2}$/.test(toUrl)) {
    const compareMode = isReportCompareMode(compareUrl) ? compareUrl : "none";
    return {
      preset: "custom",
      compareMode,
      customFrom: fromUrl,
      customTo: toUrl,
      compareCustomFrom: "",
      compareCustomTo: "",
    };
  }

  if (presetUrl === "current_week" && /^\d{4}-\d{2}-\d{2}$/.test(fromUrl)) {
    return {
      preset: "custom",
      compareMode: isReportCompareMode(compareUrl) ? compareUrl : "none",
      customFrom: fromUrl,
      customTo: toUrl || fromUrl,
      compareCustomFrom: "",
      compareCustomTo: "",
    };
  }

  const saved = loadReportPeriodPrefs();
  if (!saved) return defaults;
  let nextPreset = saved.preset;
  let nextFrom = saved.customFrom;
  let nextTo = saved.customTo;
  if (nextPreset === "custom" && (!nextFrom || !nextTo)) {
    nextPreset = "last_30_days";
    nextFrom = "";
    nextTo = "";
  }
  return {
    preset: nextPreset,
    compareMode: saved.compareMode,
    customFrom: nextFrom,
    customTo: nextTo,
    compareCustomFrom: saved.compareCustomFrom ?? "",
    compareCustomTo: saved.compareCustomTo ?? "",
  };
}
