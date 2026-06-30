import type { ReportAnalysisOutput } from "@/lib/report/report-analysis/report-analysis-schema";
import { REPORT_ANALYSIS_CACHE_TTL_MS_DEFAULT } from "@/lib/report/report-analysis/report-analysis-config";

const CACHE_PREFIX = "cab-report-ai-analysis:v2:";

export type ReportAnalysisCacheEntry = {
  cacheKey: string;
  savedAt: number;
  data: ReportAnalysisOutput;
};

export function getReportAnalysisCacheTtlMs(): number {
  return REPORT_ANALYSIS_CACHE_TTL_MS_DEFAULT;
}

export function readReportAnalysisCache(
  cacheKey: string,
  ttlMs = getReportAnalysisCacheTtlMs(),
): ReportAnalysisOutput | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReportAnalysisCacheEntry;
    if (parsed.cacheKey !== cacheKey) return null;
    if (Date.now() - parsed.savedAt > ttlMs) {
      sessionStorage.removeItem(CACHE_PREFIX + cacheKey);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeReportAnalysisCache(cacheKey: string, data: ReportAnalysisOutput): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const entry: ReportAnalysisCacheEntry = {
      cacheKey,
      savedAt: Date.now(),
      data,
    };
    sessionStorage.setItem(CACHE_PREFIX + cacheKey, JSON.stringify(entry));
  } catch {
    // sessionStorage pieno o disabilitato
  }
}

export function clearReportAnalysisCache(cacheKey: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(CACHE_PREFIX + cacheKey);
  } catch {
    // ignore
  }
}
