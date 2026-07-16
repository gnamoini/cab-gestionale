import type {
  OperationalHealthCalculation,
  OperationalHealthFactor,
  OperationalHealthScore,
} from "@/lib/dashboard/operational-health-score";
import { OPERATIONAL_HEALTH_PERIOD_LABEL } from "@/lib/dashboard/control-tower-constants";
import {
  humanizeKpiFactorLabel,
  humanizeRedactedSummary,
  humanizeRiskFactorLabel,
} from "@/lib/health-score/explain/humanize-factor-label";
import type {
  HealthScoreResult,
  KpiExplainNode,
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

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

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
  const parts: string[] = [];
  if (kpi.previous != null) {
    parts.push(`valore ${round1(kpi.current)} (prima ${round1(kpi.previous)})`);
  } else {
    parts.push(`valore ${round1(kpi.current)}`);
  }
  if (kpi.trendPct != null && Number.isFinite(kpi.trendPct)) {
    const sign = kpi.trendPct > 0 ? "+" : "";
    parts.push(`variazione ${sign}${round1(kpi.trendPct)}%`);
  }
  parts.push(`indicatore ${round1(kpi.kpiScore)}/100`);
  const weightPct = Math.round(kpi.effectiveWeight * 100);
  if (weightPct > 0) parts.push(`peso effettivo ${weightPct}%`);
  if (kpi.confidence !== "high") {
    parts.push(`affidabilità ${kpi.confidence === "medium" ? "media" : "bassa"}`);
  }
  return parts.join(" · ");
}

function buildRiskFactorDetail(risk: RiskModifierExplainNode): string {
  const penalty = Math.round(risk.penalty);
  if (penalty <= 0) return risk.motivation;
  return `Penalità −${penalty} pt sul totale · ${risk.motivation}`;
}

function buildCalculationSummary(result: HealthScoreResult): OperationalHealthCalculation {
  let weightedSum = 0;
  let weightTotal = 0;
  const sections: OperationalHealthCalculation["sections"] = [];

  for (const section of result.breakdown.sections) {
    if (section.redacted) continue;
    weightedSum += section.sectionScore * section.weight;
    weightTotal += section.weight;
    sections.push({
      label: section.label,
      score: Math.round(section.sectionScore),
      contributionPoints: Math.round(section.contributionPoints),
    });
  }

  const baseScore = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 50;
  const riskPenalty = Math.round(
    result.breakdown.riskModifiers.reduce((sum, risk) => sum + risk.penalty, 0),
  );

  return {
    periodLabel: result.periodLabel || OPERATIONAL_HEALTH_PERIOD_LABEL,
    workshopSizeLabel: workshopSizeLabel(result.workshopSize),
    baseScore,
    riskPenalty,
    scoreRaw: result.scoreRaw,
    smoothedScore: result.score,
    confidencePct: Math.round(result.confidenceOverall * 100),
    dataQualityPct: Math.round(result.dataQualityOverall * 100),
    sections,
  };
}

export function adaptHealthScoreToOperational(
  result: HealthScoreResult,
): OperationalHealthScore {
  const factors: OperationalHealthFactor[] = [];
  const activeRiskIds = new Set(
    result.breakdown.riskModifiers.filter((risk) => risk.penalty > 0).map((risk) => risk.id),
  );

  for (const section of result.breakdown.sections) {
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

  for (const risk of result.breakdown.riskModifiers) {
    if (risk.penalty > 0) {
      factors.push({
        label: humanizeRiskFactorLabel(risk),
        impact: -Math.round(risk.penalty),
        detail: buildRiskFactorDetail(risk),
      });
    }
  }

  if (result.breakdown.redactedSummary) {
    factors.push({
      label: humanizeRedactedSummary(result.breakdown.redactedSummary),
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

  const metricCount = result.breakdown.sections.reduce(
    (n, s) => n + (s.redacted ? 0 : s.kpis.length),
    0,
  );

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
