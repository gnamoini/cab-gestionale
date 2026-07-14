import type { ConfidenceAssessment } from "@/lib/health-score/registry/types";
import type { ConfidenceRules } from "@/lib/health-score/registry/types";
import type { HealthScoreConfig } from "@/lib/health-score/config/schema";

export function assessSampleConfidence(
  sampleSize: number,
  rules: ConfidenceRules,
  config: HealthScoreConfig,
): ConfidenceAssessment {
  if (sampleSize >= rules.highMin) {
    return { level: "high", multiplier: 1, reason: `campione sufficiente (n=${sampleSize})` };
  }
  if (sampleSize >= rules.mediumMin) {
    return {
      level: "medium",
      multiplier: config.confidence.mediumMultiplier,
      reason: `campione moderato (n=${sampleSize})`,
    };
  }
  return {
    level: "low",
    multiplier: config.confidence.lowMultiplier,
    reason: `campione piccolo (n=${sampleSize})`,
  };
}
