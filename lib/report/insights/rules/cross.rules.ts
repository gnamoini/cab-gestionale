import type { InsightRuleDefinition } from "@/lib/report/insights/insight-rule-types";
import { fire, makeCandidate, skipFalse, skipMissing } from "@/lib/report/insights/rules/rule-helpers";
import { deltaPct } from "@/lib/report/date-ranges";

const CROSS_DELTA_THRESHOLD_PCT = 10;

function crossMetric(ctx: import("@/lib/report/insights/insight-input").InsightRuleContext, id: string) {
  return ctx.signals.cross.get(id);
}

function compareCrossMetric(ctx: import("@/lib/report/insights/insight-input").InsightRuleContext, id: string) {
  return ctx.signals.crossCompare?.get(id);
}

export const CROSS_INSIGHT_RULES: InsightRuleDefinition[] = [
  {
    ruleKey: "CROSS_COST_JOB_SPIKE",
    ruleVersion: 1,
    domain: "cross",
    severity: "warning",
    priority: 18,
    applicability: "active",
    metricIds: ["cross_cost_job"],
    drillDown: { metricId: "cross_cost_job", targetSection: "analisi_incrociate" },
    evaluate(ctx) {
      const m = crossMetric(ctx, "cross_cost_job");
      const prev = compareCrossMetric(ctx, "cross_cost_job");
      if (!m) return skipMissing(this);
      if (m.value <= 0) return skipFalse(this);
      if (!prev || prev.value <= 0) return skipFalse(this);
      const delta = deltaPct(m.value, prev.value);
      if (delta == null || delta <= CROSS_DELTA_THRESHOLD_PCT) return skipFalse(this);
      return fire(makeCandidate(this, { costPerJob: m.value, deltaPct: delta }, m.trust));
    },
  },
  {
    ruleKey: "CROSS_VALUE_HOUR_DROP",
    ruleVersion: 1,
    domain: "cross",
    severity: "warning",
    priority: 17,
    applicability: "active",
    metricIds: ["cross_value_hour"],
    drillDown: { metricId: "cross_value_hour", targetSection: "analisi_incrociate" },
    evaluate(ctx) {
      const m = crossMetric(ctx, "cross_value_hour");
      const prev = compareCrossMetric(ctx, "cross_value_hour");
      if (!m) return skipMissing(this);
      if (m.value <= 0) return skipFalse(this);
      if (!prev || prev.value <= 0) return skipFalse(this);
      const delta = deltaPct(m.value, prev.value);
      if (delta == null || delta >= -CROSS_DELTA_THRESHOLD_PCT) return skipFalse(this);
      return fire(makeCandidate(this, { valuePerHour: m.value, deltaPct: delta }, m.trust));
    },
  },
  {
    ruleKey: "CROSS_SOURCE_PENDING",
    ruleVersion: 1,
    domain: "cross",
    severity: "info",
    priority: 6,
    applicability: "active",
    metricIds: ["cross_efficiency", "cross_parts_job", "cross_cost_job", "cross_value_hour"],
    drillDown: { metricId: "cross_efficiency", targetSection: "analisi_incrociate" },
    evaluate(ctx) {
      const pending = [...ctx.signals.cross.values()].some((m) => m.trust === "AMBER");
      if (!pending) return skipFalse(this);
      return fire(makeCandidate(this, { pending: true }, "AMBER"));
    },
  },
];
