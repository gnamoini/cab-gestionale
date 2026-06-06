import type { ReportCompareMode, ReportPeriodPreset } from "@/lib/report/date-ranges";
import { isReportPeriodPreset } from "@/lib/report/report-period-presets";

const STORAGE_KEY = "gestionale.report.period.v1";

export type ReportPeriodPrefs = {
  preset: ReportPeriodPreset;
  compareMode: ReportCompareMode;
  customFrom: string;
  customTo: string;
};

const VALID_COMPARE: ReadonlySet<string> = new Set(["none", "prev_period", "prev_year"]);

function isValidYmd(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parsePrefs(raw: unknown): ReportPeriodPrefs | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const preset = o.preset;
  const compareMode = o.compareMode;
  if (typeof preset !== "string" || !isReportPeriodPreset(preset)) return null;
  if (typeof compareMode !== "string" || !VALID_COMPARE.has(compareMode)) return null;
  const customFrom = isValidYmd(o.customFrom) ? o.customFrom : "";
  const customTo = isValidYmd(o.customTo) ? o.customTo : "";
  return {
    preset,
    compareMode: compareMode as ReportCompareMode,
    customFrom,
    customTo,
  };
}

export function loadReportPeriodPrefs(): ReportPeriodPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parsePrefs(JSON.parse(raw));
  } catch {
    return null;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function saveReportPeriodPrefs(prefs: ReportPeriodPrefs): void {
  if (typeof window === "undefined") return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* quota / private mode */
    }
  }, 300);
}

export function clearReportPeriodPrefsSaveTimer(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}
