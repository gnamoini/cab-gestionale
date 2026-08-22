import type { InsightDto } from "@/lib/report/insights/types";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import type {
  ReportOperationalCorrelation,
  ReportOperationalEvent,
} from "@/lib/report/operational-context/types";

function hasSemanticLink(insight: InsightDto, event: ReportOperationalEvent): boolean {
  if (event.insightRuleKeys?.includes(insight.ruleKey)) return true;
  if (event.metricIds?.some((m) => insight.metricIds.includes(m))) return true;
  return false;
}

function hasTemporalLink(insight: InsightDto, event: ReportOperationalEvent): boolean {
  const sharesMetric = event.metricIds?.some((m) => insight.metricIds.includes(m));
  if (!sharesMetric) return false;
  return event.type === "diary" || event.source.kind === "diary";
}

/** P5 correlation — requires explicit semantic or temporal link; delta alone is insufficient. */
export function buildOperationalCorrelations(input: {
  insights: InsightDto[];
  events: ReportOperationalEvent[];
  envelopesById: Map<string, ReportMetricEnvelope>;
}): ReportOperationalCorrelation[] {
  const out: ReportOperationalCorrelation[] = [];
  const candidates = input.insights.filter((i) => i.severity !== "info");

  for (const insight of candidates.slice(0, 8)) {
    for (const event of input.events) {
      const semantic = hasSemanticLink(insight, event);
      const temporal = hasTemporalLink(insight, event);
      if (!semantic && !temporal) continue;

      const association =
        semantic && temporal ? "correlato" : temporal ? "temporalmente_associato" : "possibile_fattore";
      out.push({
        id: `corr:${insight.ruleKey}:${event.id}`,
        label: `${insight.ruleKey} ↔ ${event.title.slice(0, 80)}`,
        association,
        metricIds: [...insight.metricIds],
        insightRuleKeys: [insight.ruleKey],
        eventIds: [event.id],
      });
      if (out.length >= 12) return out;
    }
  }

  return out;
}
