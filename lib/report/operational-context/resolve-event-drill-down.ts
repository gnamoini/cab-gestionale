import type { ReportOperationalEvent } from "@/lib/report/operational-context/types";
import type { ReportDrillDownContext } from "@/lib/report/drilldown/types";
import type { ReportRequestedPeriod } from "@/lib/report/contracts/metadata-envelope";
import type { ReportCompareMode } from "@/lib/report/contracts/metadata-envelope";
import { insightDrillDownToContext } from "@/lib/report/drilldown/drill-down-ref-bridge";
import { isDrilldownSupported } from "@/lib/report/drilldown/drilldown-metric-registry";
import type { InsightDto } from "@/lib/report/insights/types";

const ENTITY_DRILL_SUPPORTED = new Set(["lavorazione", "cliente", "ricambio", "fattura", "preventivo"]);

export function resolveMetricDrillDown(
  metricId: string,
  period: ReportRequestedPeriod,
  compareMode?: ReportCompareMode,
): ReportDrillDownContext | undefined {
  if (!isDrilldownSupported(metricId)) return undefined;
  return {
    metricId,
    period,
    compareMode,
    source: "timeline",
  };
}

export function attachEventDrillDown(input: {
  events: ReportOperationalEvent[];
  insightsByRule: Map<string, InsightDto>;
  period: ReportRequestedPeriod;
  compareMode?: ReportCompareMode;
}): ReportOperationalEvent[] {
  return input.events.map((event) => {
    if (event.drillDown) return event;
    const ruleKey = event.insightRuleKeys?.[0];
    const insight = ruleKey ? input.insightsByRule.get(ruleKey) : undefined;
    if (insight?.drillDown) {
      const ctx = insightDrillDownToContext(insight.drillDown, input.period, input.compareMode);
      if (ctx) return { ...event, drillDown: { ...ctx, source: "timeline" } };
    }
    const metricId = event.metricIds?.[0];
    if (metricId) {
      const ctx = resolveMetricDrillDown(metricId, input.period, input.compareMode);
      if (ctx) return { ...event, drillDown: ctx };
    }
    if (event.entity && ENTITY_DRILL_SUPPORTED.has(event.entity.type)) {
      const mid = event.metricIds?.[0] ?? "lav-aperti";
      if (isDrilldownSupported(mid)) {
        return {
          ...event,
          drillDown: {
            metricId: mid,
            period: input.period,
            compareMode: input.compareMode,
            source: "timeline",
            filters: { entityType: event.entity.type, entityId: event.entity.id },
          },
        };
      }
    }
    return event;
  });
}
