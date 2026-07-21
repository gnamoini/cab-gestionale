import { OPERATIONAL_HEALTH_PERIOD_LABEL } from "@/lib/dashboard/control-tower-constants";
import type {
  ControlTowerAlertsSlice,
  ControlTowerHeaderKpiSlice,
  ControlTowerKpiMetric,
} from "@/lib/dashboard/control-tower-selectors";
import type {
  SottoScortaCriticality,
  InactiveLavorazioniCriticality,
} from "@/lib/dashboard/operational-health-criticality";
import type { AssenzaRateContext } from "@/lib/dashboard/operational-health-context";

export type OperationalHealthPeriod = "rolling_30_days";

export type OperationalHealthTone = "excellent" | "good" | "warn" | "critical" | "neutral";

export type OperationalHealthFactor = {
  label: string;
  impact: number;
  /** Dettaglio calcolo (peso, trend, penalità). */
  detail?: string;
  /** Deep-link alla fonte del messaggio (lavorazione, ricambio, sezione). */
  href?: string;
};

export type OperationalHealthSectionSummary = {
  label: string;
  score: number;
  prevScore: number | null;
  deltaPoints: number | null;
  deltaPct: number | null;
  contributionPoints: number;
};

export type OperationalHealthCalculation = {
  periodLabel: string;
  workshopSizeLabel: string;
  /** Dimensione officina usata per i target (engine v2). */
  workshopSize?: "micro" | "piccola" | "media" | "grande" | "enterprise";
  baseScore: number;
  baseScorePrev: number | null;
  baseScoreDeltaPoints: number | null;
  baseScoreDeltaPct: number | null;
  riskPenalty: number;
  scoreRaw: number;
  scoreRawPrev: number | null;
  scoreRawDeltaPoints: number | null;
  scoreRawDeltaPct: number | null;
  smoothedScore: number;
  smoothedScoreDeltaPoints: number | null;
  smoothedScoreDeltaPct: number | null;
  confidencePct: number;
  dataQualityPct: number;
  sections: OperationalHealthSectionSummary[];
};

export type OperationalHealthScore = {
  score: number;
  label: string;
  tone: OperationalHealthTone;
  periodLabel: string;
  factors: OperationalHealthFactor[];
  metricCount: number;
  methodology: string;
  calculation?: OperationalHealthCalculation;
};

const METHODOLOGY =
  "Confronto rolling 30 giorni con pesi contestuali: assenze per dipendente, sotto scorta per durata, lavorazioni ferme solo negli stati di attesa e oltre la media dello stato.";

const SCORE_LABELS: { min: number; label: string; tone: OperationalHealthTone }[] = [
  { min: 80, label: "Ottimo", tone: "excellent" },
  { min: 60, label: "Buono", tone: "good" },
  { min: 40, label: "Attenzione", tone: "warn" },
  { min: 0, label: "Critico", tone: "critical" },
];

/** Peso relativo per indicatore nel punteggio composito. */
const METRIC_WEIGHTS: Partial<Record<string, number>> = {
  "lav-aperte": 1,
  "lav-completate": 1.3,
  "lav-tempo-chiusura": 1.4,
  "dip-ore": 1,
  "dip-straord": 0.8,
  "dip-assenze": 1,
  "mag-movimenti": 0.7,
  "mag-entrate": 0.9,
  "mag-consumi": 0.9,
  "mag-sotto-scorta": 1.4,
  "prev-emessi": 0.8,
  "fatt-emesse": 0.7,
  "fatt-pagate": 0.9,
  "fatt-fatturato": 1.2,
  "fatt-incassato": 1.2,
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function scoreLabelAndTone(score: number): Pick<OperationalHealthScore, "label" | "tone"> {
  const band = SCORE_LABELS.find((b) => score >= b.min) ?? SCORE_LABELS[SCORE_LABELS.length - 1]!;
  return { label: band.label, tone: band.tone };
}

function metricWeight(metric: ControlTowerKpiMetric): number {
  return METRIC_WEIGHTS[metric.id] ?? 0.8;
}

function sottoScortaSubScore(metric: ControlTowerKpiMetric, criticality?: SottoScortaCriticality): number | null {
  if (metric.value <= 0 && (criticality?.count ?? 0) <= 0) return null;
  if (criticality && criticality.count > 0) {
    return clamp(48 - criticality.weightedSeverity * 9, 5, 48);
  }
  return clamp(48 - metric.value * 4, 5, 48);
}

function assenzaSubScore(metric: ControlTowerKpiMetric, assenza?: AssenzaRateContext): number | null {
  if (assenza?.deltaPct != null && Number.isFinite(assenza.deltaPct)) {
    const signed = -assenza.deltaPct;
    return clamp(50 + signed * 0.35, 10, 90);
  }
  return metricSubScoreFromDelta(metric);
}

function metricSubScoreFromDelta(metric: ControlTowerKpiMetric): number | null {
  if (metric.deltaPct == null || !Number.isFinite(metric.deltaPct)) return 50;
  const signed = metric.invert ? -metric.deltaPct : metric.deltaPct;
  return clamp(50 + signed * 0.35, 10, 90);
}

function metricSubScore(
  metric: ControlTowerKpiMetric,
  context?: {
    sottoScorta?: SottoScortaCriticality;
    assenza?: AssenzaRateContext;
  },
): number | null {
  if (metric.snapshot) {
    if (metric.value <= 0) return null;
    if (metric.id === "lav-urgenti") return null;
    if (metric.id === "mag-sotto-scorta") return sottoScortaSubScore(metric, context?.sottoScorta);
    return null;
  }
  if (metric.id === "dip-assenze") return assenzaSubScore(metric, context?.assenza);
  return metricSubScoreFromDelta(metric);
}

function formatMetricFactorLabel(
  metric: ControlTowerKpiMetric,
  context?: {
    sottoScorta?: SottoScortaCriticality;
    assenza?: AssenzaRateContext;
  },
): string {
  if (metric.snapshot) {
    if (metric.id === "lav-urgenti") return metric.label;
    if (metric.id === "mag-sotto-scorta") {
      const sotto = context?.sottoScorta;
      if (sotto && sotto.count > 0) {
        const maxDays = Math.round(sotto.maxDays);
        if (maxDays >= 7) return `${sotto.count} sotto scorta (fino a ${maxDays} gg)`;
        if (maxDays >= 1) return `${sotto.count} sotto scorta (da ${maxDays} gg)`;
        return `${sotto.count} sotto scorta (recente)`;
      }
      return `${metric.value} articoli sotto scorta`;
    }
    return metric.label;
  }
  if (metric.id === "dip-assenze" && context?.assenza) {
    const a = context.assenza;
    const pct = a.deltaPct;
    if (pct != null && Number.isFinite(pct)) {
      const sign = pct > 0 ? "+" : "";
      return `Assenze pro-capite (${sign}${pct.toLocaleString("it-IT", { maximumFractionDigits: 0 })}%)`;
    }
  }
  const pct = metric.deltaPct;
  if (pct == null || !Number.isFinite(pct)) return metric.label;
  const sign = pct > 0 ? "+" : "";
  return `${metric.label} (${sign}${pct.toLocaleString("it-IT", { maximumFractionDigits: 0 })}%)`;
}

function kpiContributions(
  headerKpi: ControlTowerHeaderKpiSlice,
  context?: {
    sottoScorta?: SottoScortaCriticality;
    assenza?: AssenzaRateContext;
  },
): {
  baseScore: number;
  factors: OperationalHealthFactor[];
  metricCount: number;
} {
  let totalWeight = 0;
  let weightedSum = 0;
  let metricCount = 0;
  const factors: OperationalHealthFactor[] = [];

  for (const cluster of headerKpi.clusters) {
    for (const metric of cluster.metrics) {
      const sub = metricSubScore(metric, context);
      if (sub == null) continue;
      const weight = metricWeight(metric);
      totalWeight += weight;
      weightedSum += sub * weight;
      metricCount += 1;
    }
  }

  const baseScore = totalWeight > 0 ? weightedSum / totalWeight : 50;

  for (const cluster of headerKpi.clusters) {
    for (const metric of cluster.metrics) {
      const sub = metricSubScore(metric, context);
      if (sub == null || totalWeight <= 0) continue;
      const impact = ((sub - 50) * metricWeight(metric)) / totalWeight;
      if (Math.abs(impact) < 0.5) continue;
      factors.push({
        label: formatMetricFactorLabel(metric, context),
        impact: Math.round(impact),
      });
    }
  }

  return { baseScore, factors, metricCount };
}

const ALERT_IDS_IN_KPI = new Set(["mag-sotto-scorta", "lav-stale"]);

function formatInactiveLavorazioniFactor(inactive: InactiveLavorazioniCriticality): string {
  const stati =
    inactive.statoLabels.length > 0
      ? inactive.statoLabels.slice(0, 2).join(", ")
      : "stati di attesa";
  const maxDays = Math.round(inactive.maxDays);
  return `${inactive.count} in ${stati} oltre la media${maxDays > 0 ? ` (fino a ${maxDays} gg)` : ""}`;
}

function alertPenalties(
  alerts: ControlTowerAlertsSlice,
  context?: { inactiveLavorazioni?: InactiveLavorazioniCriticality },
): { penalty: number; factors: OperationalHealthFactor[] } {
  const factors: OperationalHealthFactor[] = [];
  let penalty = 0;

  for (const item of alerts.items) {
    if (ALERT_IDS_IN_KPI.has(item.id)) continue;

    if (item.severity === "critical") {
      const itemPenalty = 8;
      penalty += itemPenalty;
      factors.push({
        label: item.detail ? `${item.title}: ${item.detail}` : item.title,
        impact: -itemPenalty,
      });
      continue;
    }

    if (item.severity === "warning") {
      const itemPenalty = 4;
      penalty += itemPenalty;
      const detail = item.detail ? `: ${item.detail}` : "";
      factors.push({
        label: `${item.title}${detail}`,
        impact: -itemPenalty,
      });
    }
  }

  const inactive = context?.inactiveLavorazioni;
  if (inactive && inactive.count > 0) {
    const itemPenalty = Math.min(inactive.weightedExcessDays * 5 + inactive.count * 2, 22);
    penalty += itemPenalty;
    factors.push({
      label: formatInactiveLavorazioniFactor(inactive),
      impact: -Math.round(itemPenalty),
    });
  }

  return { penalty: Math.min(penalty, 35), factors };
}

export function splitHealthFactors(factors: OperationalHealthFactor[]): {
  positive: OperationalHealthFactor[];
  negative: OperationalHealthFactor[];
} {
  return {
    positive: factors.filter((f) => f.impact > 0).sort((a, b) => b.impact - a.impact),
    negative: factors.filter((f) => f.impact < 0).sort((a, b) => a.impact - b.impact),
  };
}

export function computeOperationalHealthScore(input: {
  headerKpi: ControlTowerHeaderKpiSlice;
  alerts: ControlTowerAlertsSlice;
  period?: OperationalHealthPeriod;
  criticality?: {
    sottoScorta?: SottoScortaCriticality;
    inactiveLavorazioni?: InactiveLavorazioniCriticality;
    assenza?: AssenzaRateContext;
  };
}): OperationalHealthScore {
  const { headerKpi, alerts, criticality } = input;
  const kpiPart = kpiContributions(headerKpi, criticality);
  const alertsPart = alertPenalties(alerts, criticality);

  const raw = kpiPart.baseScore - alertsPart.penalty;
  const score = clamp(Math.round(raw), 0, 100);
  const { label, tone } = scoreLabelAndTone(score);

  const factors: OperationalHealthFactor[] = [...kpiPart.factors, ...alertsPart.factors];
  if (factors.length === 0) {
    factors.push({ label: "Indicatori in linea col periodo precedente", impact: 0 });
  }

  return {
    score,
    label,
    tone,
    periodLabel: OPERATIONAL_HEALTH_PERIOD_LABEL,
    factors,
    metricCount: kpiPart.metricCount,
    methodology: METHODOLOGY,
  };
}

export function hasOperationalHealthData(headerKpi: ControlTowerHeaderKpiSlice): boolean {
  return headerKpi.clusters.length > 0;
}
