import type { InsightRuleDefinition } from "@/lib/report/insights/insight-rule-types";
import { fire, makeCandidate, skipDeferred, skipFalse, skipMissing } from "@/lib/report/insights/rules/rule-helpers";

export const ORE_INSIGHT_RULES: InsightRuleDefinition[] = [
  {
    ruleKey: "ORE_HOURS_LOW",
    ruleVersion: 1,
    domain: "ore",
    severity: "warning",
    priority: 11,
    applicability: "active",
    metricIds: ["ore_total"],
    drillDown: { metricId: "ore_total", targetSection: "ore_lavorate" },
    evaluate(ctx) {
      const ore = ctx.signals.ore;
      if (!ore) return skipMissing(this);
      if (ore.totalHours > 0) return skipFalse(this);
      return fire(makeCandidate(this, { hours: 0 }));
    },
  },
  {
    ruleKey: "ORE_PER_JOB",
    ruleVersion: 1,
    domain: "ore",
    severity: "info",
    priority: 9,
    applicability: "active",
    metricIds: ["ore_total", "lav-chiusi"],
    drillDown: { metricId: "ore_total", targetSection: "ore_lavorate" },
    evaluate(ctx) {
      const ore = ctx.signals.ore;
      const lav = ctx.signals.lavorazioni;
      if (!ore || !lav) return skipMissing(this);
      if (lav.closed <= 0 || ore.totalHours <= 0) return skipFalse(this);
      const avg = Math.round((ore.totalHours / lav.closed) * 10) / 10;
      return fire(makeCandidate(this, { avgHours: avg, hours: ore.totalHours, jobs: lav.closed }));
    },
  },
  {
    ruleKey: "ORE_MAINTENANCE_COST",
    ruleVersion: 1,
    domain: "ore",
    severity: "info",
    priority: 8,
    applicability: "active",
    metricIds: ["cost-tot"],
    drillDown: { metricId: "cost-tot", targetSection: "ore_lavorate" },
    evaluate(ctx) {
      const ore = ctx.signals.ore;
      if (!ore) return skipMissing(this);
      if (ore.maintenanceCost <= 0) return skipFalse(this);
      return fire(makeCandidate(this, { cost: ore.maintenanceCost }));
    },
  },
  {
    ruleKey: "ORE_OVERTIME",
    ruleVersion: 1,
    domain: "ore",
    severity: "warning",
    priority: 13,
    applicability: "deferred",
    metricIds: ["ore_total"],
    drillDown: { metricId: "ore_total", targetSection: "ore_lavorate" },
    evaluate() {
      return skipDeferred(this);
    },
  },
];
