import type { OperationalHealthFactor, OperationalHealthScore } from "@/lib/dashboard/operational-health-score";
import { OPERATIONAL_HEALTH_PERIOD_LABEL } from "@/lib/dashboard/control-tower-constants";
import {
  humanizeKpiFactorLabel,
  humanizeRedactedSummary,
  humanizeRiskFactorLabel,
} from "@/lib/health-score/explain/humanize-factor-label";
import type { HealthScoreResult } from "@/lib/health-score/types";

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
      if (kpi.redacted || Math.abs(kpi.contributionPoints) < 0.5) continue;
      // ponytail: sla-late-pct e late-ingress misurano la stessa quota — mostra solo il risk (conteggio).
      if (kpi.id === "sla-late-pct" && activeRiskIds.has("late-ingress")) continue;
      factors.push({
        label: humanizeKpiFactorLabel(kpi),
        impact: Math.round(kpi.contributionPoints),
      });
    }
  }

  for (const risk of result.breakdown.riskModifiers) {
    if (risk.penalty > 0) {
      factors.push({
        label: humanizeRiskFactorLabel(risk),
        impact: -Math.round(risk.penalty),
      });
    }
  }

  if (result.breakdown.redactedSummary) {
    factors.push({
      label: humanizeRedactedSummary(result.breakdown.redactedSummary),
      impact: 0,
    });
  }

  if (factors.length === 0) {
    factors.push({ label: "Indicatori in linea col periodo precedente", impact: 0 });
  }

  const metricCount = result.breakdown.sections.reduce(
    (n, s) => n + (s.redacted ? 0 : s.kpis.length),
    0,
  );

  return {
    score: result.score,
    label: result.label,
    tone: result.tone,
    periodLabel: OPERATIONAL_HEALTH_PERIOD_LABEL,
    factors,
    metricCount,
    methodology: "",
  };
}
