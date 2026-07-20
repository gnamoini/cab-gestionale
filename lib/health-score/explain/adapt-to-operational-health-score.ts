import type {
  OperationalHealthCalculation,
  OperationalHealthFactor,
  OperationalHealthScore,
} from "@/lib/dashboard/operational-health-score";
import { OPERATIONAL_HEALTH_PERIOD_LABEL } from "@/lib/dashboard/control-tower-constants";
import {
  humanizeKpiFactorLabel,
  humanizeKpiFactorMeta,
  humanizeRedactedSummary,
  humanizeRiskFactorLabel,
  humanizeRiskFactorMeta,
} from "@/lib/health-score/explain/humanize-factor-label";
import { filterBreakdownForViewer } from "@/lib/health-score/explain/filter-breakdown-for-viewer";
import { resolveSectionPrevScore } from "@/lib/health-score/explain/section-prev-score";
import type {
  HealthScoreBreakdown,
  HealthScoreResult,
  KpiExplainNode,
  ModuleAccessMap,
  RiskModifierExplainNode,
  WorkshopSize,
} from "@/lib/health-score/types";

const WORKSHOP_SIZE_LABELS: Record<WorkshopSize, string> = {
  micro: "Officina micro",
  piccola: "Officina piccola",
  media: "Officina media",
  grande: "Officina grande",
  enterprise: "Officina grande",
};


function kpiImpactPoints(contributionPoints: number): number | null {
  if (Math.abs(contributionPoints) < 0.25) return null;
  const rounded = Math.round(contributionPoints);
  if (rounded !== 0) return rounded;
  // ponytail: contributi tra ±0.25 e ±0.49 → ±1 in elenco
  return contributionPoints > 0 ? 1 : -1;
}

function workshopSizeLabel(size: WorkshopSize): string {
  return WORKSHOP_SIZE_LABELS[size] ?? "Officina";
}

function buildKpiFactorDetail(kpi: KpiExplainNode): string {
  return humanizeKpiFactorMeta(kpi);
}

function buildRiskFactorDetail(risk: RiskModifierExplainNode): string {
  return humanizeRiskFactorMeta(risk);
}

function metricPeriodCompare(
  current: number,
  prev: number | null,
): { prevScore: number | null; deltaPoints: number | null; deltaPct: number | null } {
  if (prev == null || !Number.isFinite(prev)) {
    return { prevScore: null, deltaPoints: null, deltaPct: null };
  }
  const prevRounded = Math.round(prev);
  const deltaPoints = current - prevRounded;
  const deltaPct =
    prevRounded !== 0 ? (deltaPoints / Math.abs(prevRounded)) * 100 : null;
  return { prevScore: prevRounded, deltaPoints, deltaPct };
}

function buildCalculationSummary(result: HealthScoreResult): OperationalHealthCalculation {
  let weightedSum = 0;
  let weightTotal = 0;
  const sections: OperationalHealthCalculation["sections"] = [];

  for (const section of result.breakdown.sections) {
    weightedSum += section.sectionScore * section.weight;
    weightTotal += section.weight;
    const score = Math.round(section.sectionScore);
    const prevResolved = resolveSectionPrevScore(section);
    const prevRounded = prevResolved != null ? Math.round(prevResolved) : null;
    const deltaPoints = prevRounded != null ? score - prevRounded : null;
    const deltaPct =
      prevRounded != null && prevRounded !== 0
        ? ((score - prevRounded) / Math.abs(prevRounded)) * 100
        : null;
    sections.push({
      label: section.label,
      score,
      prevScore: prevRounded,
      deltaPoints,
      deltaPct,
      contributionPoints: Math.round(section.contributionPoints),
    });
  }

  const baseScore = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 50;
  const riskPenalty = Math.round(
    result.breakdown.riskModifiers.reduce((sum, risk) => sum + risk.penalty, 0),
  );

  let prevWeightedSum = 0;
  let prevWeightTotal = 0;
  for (const section of result.breakdown.sections) {
    const prev = resolveSectionPrevScore(section);
    if (prev == null) continue;
    prevWeightedSum += prev * section.weight;
    prevWeightTotal += section.weight;
  }
  const baseScorePrevRaw = prevWeightTotal > 0 ? prevWeightedSum / prevWeightTotal : null;
  const baseCompare = metricPeriodCompare(baseScore, baseScorePrevRaw);
  const scoreRawPrev =
    baseScorePrevRaw != null
      ? Math.max(0, Math.min(100, Math.round(baseScorePrevRaw - riskPenalty)))
      : null;
  const scoreRawCompare = metricPeriodCompare(result.scoreRaw, scoreRawPrev);
  const smoothedCompare = metricPeriodCompare(result.score, scoreRawPrev);

  return {
    periodLabel: result.periodLabel || OPERATIONAL_HEALTH_PERIOD_LABEL,
    workshopSizeLabel: workshopSizeLabel(result.workshopSize),
    workshopSize: result.workshopSize,
    baseScore,
    baseScorePrev: baseCompare.prevScore,
    baseScoreDeltaPoints: baseCompare.deltaPoints,
    baseScoreDeltaPct: baseCompare.deltaPct,
    riskPenalty,
    scoreRaw: result.scoreRaw,
    scoreRawPrev: scoreRawCompare.prevScore,
    scoreRawDeltaPoints: scoreRawCompare.deltaPoints,
    scoreRawDeltaPct: scoreRawCompare.deltaPct,
    smoothedScore: result.score,
    smoothedScoreDeltaPoints: smoothedCompare.deltaPoints,
    smoothedScoreDeltaPct: smoothedCompare.deltaPct,
    confidencePct: Math.round(result.confidenceOverall * 100),
    dataQualityPct: Math.round(result.dataQualityOverall * 100),
    sections,
  };
}

function buildFactorsFromBreakdown(breakdown: HealthScoreBreakdown): OperationalHealthFactor[] {
  const factors: OperationalHealthFactor[] = [];
  const activeRiskIds = new Set(
    breakdown.riskModifiers.filter((risk) => risk.penalty > 0).map((risk) => risk.id),
  );

  for (const section of breakdown.sections) {
    if (section.redacted) continue;
    for (const kpi of section.kpis) {
      if (kpi.redacted) continue;
      const impact = kpiImpactPoints(kpi.contributionPoints);
      if (impact == null) continue;
      // ponytail: sla-late-pct e late-ingress misurano la stessa quota — mostra solo il risk (conteggio).
      if (kpi.id === "sla-late-pct" && activeRiskIds.has("late-ingress")) continue;
      factors.push({
        label: humanizeKpiFactorLabel(kpi),
        impact,
        detail: buildKpiFactorDetail(kpi),
      });
    }
  }

  for (const risk of breakdown.riskModifiers) {
    if (risk.penalty > 0) {
      factors.push({
        label: humanizeRiskFactorLabel(risk),
        impact: -Math.round(risk.penalty),
        detail: buildRiskFactorDetail(risk),
      });
    }
  }

  if (breakdown.redactedSummary) {
    factors.push({
      label: humanizeRedactedSummary(breakdown.redactedSummary),
      impact: 0,
      detail: "Alcune aree non sono incluse nel dettaglio per i tuoi permessi di lettura.",
    });
  }

  if (factors.length === 0) {
    factors.push({
      label: "Indicatori in linea col periodo precedente",
      impact: 0,
      detail: "Nessuna variazione rilevante oltre le soglie di visualizzazione.",
    });
  }

  return factors;
}

export function adaptHealthScoreToOperational(
  result: HealthScoreResult,
  access?: ModuleAccessMap,
): OperationalHealthScore {
  const breakdownForFactors =
    access != null ? filterBreakdownForViewer(result.breakdown, access) : result.breakdown;
  const factors = buildFactorsFromBreakdown(breakdownForFactors);

  const metricCount = result.breakdown.sections.reduce((n, s) => n + s.kpis.length, 0);

  const calculation = buildCalculationSummary(result);

  return {
    score: result.score,
    label: result.label,
    tone: result.tone,
    periodLabel: OPERATIONAL_HEALTH_PERIOD_LABEL,
    factors,
    metricCount,
    methodology: `Media ponderata per area (${metricCount} indicatori), meno penalità per ritardi e stagnazione.`,
    calculation,
  };
}
