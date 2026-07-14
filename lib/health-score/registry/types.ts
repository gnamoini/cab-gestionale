import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import type { ConfidenceLevel, DataQualityLevel, KpiContext, KpiRawValue } from "@/lib/health-score/types";

export type ConfidenceRules = {
  highMin: number;
  mediumMin: number;
};

export type DataQualityRules = {
  /** Flag issue id se coverage sotto soglia. */
  coverageFlagThreshold?: number;
};

export type NormalizerFn = (
  raw: KpiRawValue,
  target: number,
  ctx: KpiContext,
  invert: boolean,
) => { score: number; trace: import("@/lib/health-score/types").FormulaTraceStep[] };

export type HealthKpiDefinition = {
  id: string;
  sectionId: string;
  title: string;
  requiredModules: GestionalePermissionModule[];
  weight: number;
  trendWeight: number;
  levelWeight: number;
  invertTrend?: boolean;
  invertLevel?: boolean;
  sampleRules: ConfidenceRules;
  qualityRules?: DataQualityRules;
  dependencies?: string[];
  targetKey: string;
  selector: (ctx: KpiContext) => KpiRawValue;
  normalizer: {
    trend: NormalizerFn;
    level: NormalizerFn;
  };
  recommendedActions?: (result: {
    raw: KpiRawValue;
    kpiScore: number;
    target: number;
  }) => string[];
};

export type HealthSectionDefinition = {
  id: string;
  title: string;
  weight: number;
  requiredModules?: GestionalePermissionModule[];
};

export type RiskModifierDefinition = {
  id: string;
  title: string;
  compute: (ctx: KpiContext) => {
    penalty: number;
    motivation: string;
    trace: import("@/lib/health-score/types").FormulaTraceStep[];
  };
};

export type ConfidenceAssessment = {
  level: ConfidenceLevel;
  multiplier: number;
  reason: string;
};

export type DataQualityAssessment = {
  level: DataQualityLevel;
  multiplier: number;
  issues: string[];
};
