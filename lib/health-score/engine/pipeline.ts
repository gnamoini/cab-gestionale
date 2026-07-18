import { assessDefaultDataQuality, assessTimesheetDataQuality } from "@/lib/health-score/data-quality/assess-data-quality";
import { assessSampleConfidence } from "@/lib/health-score/confidence/sample-confidence";
import { resolveDependencyFactor, resolveDynamicWeight } from "@/lib/health-score/dependencies/kpi-dependency-graph";
import type { HealthScoreConfig } from "@/lib/health-score/config/schema";
import { appendTrace } from "@/lib/health-score/explain/formula-trace";
import { scoreLabelAndTone } from "@/lib/health-score/explain/filter-breakdown-for-viewer";
import { getAllHealthKpis } from "@/lib/health-score/registry/kpi-registry";
import { getAllHealthSections } from "@/lib/health-score/registry/section-registry";
import { getAllRiskModifiers } from "@/lib/health-score/registry/risk-modifier-registry";
import { blendTrendLevel } from "@/lib/health-score/normalizers/tanh-normalizer";
import { resolveTarget } from "@/lib/health-score/targets/target-provider";
import { classifyWorkshopSize } from "@/lib/health-score/workshop-size/classify-workshop-size";
import type {
  HealthScoreBreakdown,
  HealthScoreResult,
  HealthScoreStatus,
  InputSnapshot,
  KpiContext,
  KpiExplainNode,
  SectionExplainNode,
} from "@/lib/health-score/types";
import type { DateRange } from "@/lib/report/date-ranges";
import {
  HEALTH_SCORE_ENGINE_VERSION,
  HEALTH_SCORE_SCHEMA_VERSION,
} from "@/lib/health-score/versions";
import { OPERATIONAL_HEALTH_PERIOD_LABEL } from "@/lib/dashboard/control-tower-constants";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export type ComputeHealthScoreInput = {
  snapshot: InputSnapshot;
  config: HealthScoreConfig;
  anchor: Date;
  range: DateRange;
  prevRange: DateRange;
  previousSmoothedScore?: number | null;
  status?: HealthScoreStatus;
  cacheHit?: boolean;
  computedAt?: string;
};

export function computeHealthScoreFromSnapshot(input: ComputeHealthScoreInput): HealthScoreResult {
  const {
    snapshot,
    config,
    anchor,
    range,
    prevRange,
    previousSmoothedScore = null,
    status = "READY",
    cacheHit = false,
    computedAt = anchor.toISOString(),
  } = input;

  const workshopSize = classifyWorkshopSize(snapshot);
  const kpiResults = new Map<string, { kpiScore: number; effectiveWeight: number }>();

  const ctxBase: Omit<KpiContext, "kpiResults"> = {
    snapshot,
    workshopSize,
    config,
    anchor,
    range,
    prevRange,
  };

  const kpiNodes: KpiExplainNode[] = [];
  const kpiPrevScores = new Map<string, number>();

  for (const kpi of getAllHealthKpis()) {
    const ctx: KpiContext = { ...ctxBase, kpiResults };
    const raw = kpi.selector(ctx);
    const target = resolveTarget(kpi.targetKey, { workshopSize, config });
    const confidence = assessSampleConfidence(raw.sampleSize, kpi.sampleRules, config);
    const dataQuality =
      kpi.sectionId === "personale"
        ? assessTimesheetDataQuality(snapshot, config)
        : assessDefaultDataQuality(snapshot);

    const trend = kpi.normalizer.trend(raw, target, ctx, kpi.invertTrend ?? false);
    const level = kpi.normalizer.level(raw, target, ctx, kpi.invertLevel ?? false);
    const blended = blendTrendLevel(trend.score, level.score, kpi.trendWeight, kpi.levelWeight);

    const staticWeight = kpi.weight * (config.sections[kpi.sectionId] ?? 1);
    const dynamicWeight = resolveDynamicWeight(kpi.id, snapshot);
    const dependencyFactor = resolveDependencyFactor(kpi.id, config, snapshot, kpiResults);
    const effectiveWeight =
      staticWeight *
      dynamicWeight *
      confidence.multiplier *
      dataQuality.multiplier *
      dependencyFactor;

    kpiResults.set(kpi.id, { kpiScore: blended.score, effectiveWeight });

    let kpiScorePrev: number | null = null;
    if (raw.previous != null) {
      const prevRaw = { ...raw, current: raw.previous };
      const prevTrend = kpi.normalizer.trend(prevRaw, target, ctx, kpi.invertTrend ?? false);
      const prevLevel = kpi.normalizer.level(prevRaw, target, ctx, kpi.invertLevel ?? false);
      const prevBlended = blendTrendLevel(
        prevTrend.score,
        prevLevel.score,
        kpi.trendWeight,
        kpi.levelWeight,
      );
      kpiScorePrev = prevBlended.score;
      kpiPrevScores.set(kpi.id, prevBlended.score);
    }

    const sectionWeight = config.sections[kpi.sectionId] ?? 0;
    const contributionPoints = sectionWeight > 0 ? (blended.score - 50) * (effectiveWeight / 10) : 0;

    kpiNodes.push({
      id: kpi.id,
      label: kpi.title,
      sectionId: kpi.sectionId,
      current: raw.current,
      previous: raw.previous,
      target,
      trendPct: raw.previous != null && raw.previous !== 0 ? ((raw.current - raw.previous) / Math.abs(raw.previous)) * 100 : null,
      trendScore: trend.score,
      levelScore: level.score,
      kpiScore: blended.score,
      kpiScorePrev,
      staticWeight,
      dynamicWeight,
      confidence: confidence.level,
      confidenceMultiplier: confidence.multiplier,
      dataQuality: dataQuality.level,
      dataQualityMultiplier: dataQuality.multiplier,
      dependencyFactor,
      effectiveWeight,
      contributionPoints,
      motivation: `${kpi.title}: ${confidence.reason}`,
      trace: appendTrace(trend.trace, level.trace, blended.trace),
      recommendedActions: kpi.recommendedActions?.({ raw, kpiScore: blended.score, target }),
    });
  }

  const sections: SectionExplainNode[] = [];
  let weightedSum = 0;
  let weightTotal = 0;

  for (const section of getAllHealthSections()) {
    if (section.id === "rischio") continue;
    const sectionKpis = kpiNodes.filter((k) => k.sectionId === section.id);
    const sectionWeight = config.sections[section.id] ?? section.weight;
    let sectionScoreSum = 0;
    let sectionWeightSum = 0;
    let sectionContribution = 0;
    let sectionPrevScoreSum = 0;
    let sectionPrevWeightSum = 0;

    for (const kpi of sectionKpis) {
      if (kpi.effectiveWeight <= 0) continue;
      sectionScoreSum += kpi.kpiScore * kpi.effectiveWeight;
      sectionWeightSum += kpi.effectiveWeight;
      sectionContribution += kpi.contributionPoints;
      const prevScore = kpiPrevScores.get(kpi.id);
      if (prevScore != null) {
        sectionPrevScoreSum += prevScore * kpi.effectiveWeight;
        sectionPrevWeightSum += kpi.effectiveWeight;
      }
    }

    const sectionScore = sectionWeightSum > 0 ? sectionScoreSum / sectionWeightSum : 50;
    const sectionScorePrev =
      sectionPrevWeightSum > 0 ? sectionPrevScoreSum / sectionPrevWeightSum : null;
    weightedSum += sectionScore * sectionWeight;
    weightTotal += sectionWeight;

    sections.push({
      id: section.id,
      label: section.title,
      weight: sectionWeight,
      sectionScore: Math.round(sectionScore * 10) / 10,
      sectionScorePrev: sectionScorePrev != null ? Math.round(sectionScorePrev * 10) / 10 : null,
      contributionPoints: Math.round(sectionContribution * 10) / 10,
      kpis: sectionKpis,
    });
  }

  const baseScore = weightTotal > 0 ? weightedSum / weightTotal : 50;

  const riskModifiers = getAllRiskModifiers().map((mod) => {
    const ctx: KpiContext = { ...ctxBase, kpiResults };
    const result = mod.compute(ctx);
    return {
      id: mod.id,
      label: mod.title,
      penalty: result.penalty,
      motivation: result.motivation,
      trace: result.trace,
    };
  });

  const riskPenalty = Math.min(
    riskModifiers.reduce((s, r) => s + r.penalty, 0),
    config.riskCap,
  );

  const scoreRaw = clamp(Math.round(baseScore - riskPenalty), 0, 100);
  const alpha = config.smoothing.alpha;
  const scoreSmoothed =
    previousSmoothedScore != null
      ? clamp(Math.round(alpha * scoreRaw + (1 - alpha) * previousSmoothedScore), 0, 100)
      : scoreRaw;

  const { label, tone } = scoreLabelAndTone(scoreSmoothed);

  const confidenceValues = kpiNodes.map((k) => k.confidenceMultiplier);
  const qualityValues = kpiNodes.map((k) => k.dataQualityMultiplier);
  const confidenceOverall =
    confidenceValues.length > 0
      ? confidenceValues.reduce((s, v) => s + v, 0) / confidenceValues.length
      : 1;
  const dataQualityOverall =
    qualityValues.length > 0 ? qualityValues.reduce((s, v) => s + v, 0) / qualityValues.length : 1;

  const breakdown: HealthScoreBreakdown = {
    sections,
    riskModifiers,
    redactedContributionPoints: 0,
  };

  return {
    status,
    score: scoreSmoothed,
    scoreRaw,
    label,
    tone,
    periodLabel: OPERATIONAL_HEALTH_PERIOD_LABEL,
    workshopSize,
    confidenceOverall: Math.round(confidenceOverall * 100) / 100,
    dataQualityOverall: Math.round(dataQualityOverall * 100) / 100,
    breakdown,
    engineVersion: HEALTH_SCORE_ENGINE_VERSION,
    configVersion: config.configVersion,
    schemaVersion: HEALTH_SCORE_SCHEMA_VERSION,
    computedAt,
    period: range,
    prevPeriod: prevRange,
    cacheHit,
  };
}
