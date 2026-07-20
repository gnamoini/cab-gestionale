import type { FactEngineOutput } from "@/lib/operational-intelligence/facts/build-fact-engine";
import type { ReportInsightsDto } from "@/lib/report/insights/types";
import type {
  DomainTrend,
  OperationalBriefScore,
  OperationalBriefScoreStatus,
} from "@/lib/operational-intelligence/types";

function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, n));
}

function domainScore(base: number, penalty: number): number {
  return clamp(Math.round(base - penalty));
}

function statusFromScore(score: number): OperationalBriefScoreStatus {
  if (score >= 75) return "green";
  if (score >= 50) return "amber";
  return "red";
}

function trendFromDelta(deltaPct: number | null): DomainTrend {
  if (deltaPct == null || Math.abs(deltaPct) < 3) return "flat";
  return deltaPct > 0 ? "up" : "down";
}

/** Score dedicato al brief — distinto da Health Score dashboard. */
export function buildOperationalBriefScore(
  facts: FactEngineOutput,
  insights: ReportInsightsDto,
): OperationalBriefScore {
  const m = facts.metrics;
  const criticalCount = insights.insights.filter((i) => i.severity === "critical").length;
  const warningCount = insights.insights.filter((i) => i.severity === "warning").length;

  const production = domainScore(90, (m.lav_open ?? 0) * 2 + (m.lav_late_sla ?? 0) * 5);
  const reliability = domainScore(85, (m.lav_avg_close_days ?? 0) * 3 + criticalCount * 8);
  const warehouse = domainScore(88, (m.mag_low_stock ?? 0) * 6);
  const staff = domainScore(80, (m.ore_total ?? 0) === 0 ? 25 : 0);
  const costs = domainScore(82, warningCount * 4);

  const domains = {
    production: { score: production, trend: trendFromDelta(null) },
    reliability: { score: reliability, trend: trendFromDelta(null) },
    warehouse: { score: warehouse, trend: trendFromDelta(null) },
    staff: { score: staff, trend: trendFromDelta(null) },
    costs: { score: costs, trend: trendFromDelta(null) },
  };

  const overall = Math.round(
    (production + reliability + warehouse + staff + costs) / 5,
  );

  const reasons: string[] = [];
  if ((m.lav_late_sla ?? 0) > 0) reasons.push(`${m.lav_late_sla} lavorazioni oltre SLA`);
  if ((m.lav_open ?? 0) > 5) reasons.push(`backlog ${m.lav_open} aperti`);
  if ((m.mag_low_stock ?? 0) > 0) reasons.push(`${m.mag_low_stock} ricambi sotto scorta`);
  if (criticalCount > 0) reasons.push(`${criticalCount} segnali critici`);

  return {
    overall,
    status: statusFromScore(overall),
    domains,
    reasons,
  };
}
