import type { DataQualityAssessment } from "@/lib/health-score/registry/types";
import type { HealthScoreConfig } from "@/lib/health-score/config/schema";
import type { InputSnapshot } from "@/lib/health-score/types";

export function assessTimesheetDataQuality(
  snapshot: InputSnapshot,
  config: HealthScoreConfig,
): DataQualityAssessment {
  const coverage = snapshot.timesheetCoveragePct;
  const issues: string[] = [];
  if (coverage < 50) issues.push(`timesheet_coverage_${Math.round(coverage)}pct`);
  if (coverage < 70) {
    return {
      level: coverage < 50 ? "low" : "medium",
      multiplier: coverage < 50 ? config.dataQuality.lowMultiplier : config.dataQuality.mediumMultiplier,
      issues,
    };
  }
  return { level: "high", multiplier: 1, issues };
}

export function assessDefaultDataQuality(
  snapshot: InputSnapshot,
  flagPrefix?: string,
): DataQualityAssessment {
  const issues = flagPrefix
    ? snapshot.dataQualityFlags.filter((f) => f.startsWith(flagPrefix))
    : snapshot.dataQualityFlags;
  if (issues.length > 0) {
    return { level: "medium", multiplier: 0.85, issues };
  }
  return { level: "high", multiplier: 1, issues: [] };
}
