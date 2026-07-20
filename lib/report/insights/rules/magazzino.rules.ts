import type { InsightRuleDefinition } from "@/lib/report/insights/insight-rule-types";
import {
  MAG_COVERAGE_CRITICAL_DAYS,
  MAG_PARTS_SPIKE_RATIO,
  detectMagazzinoConsumoSpike,
} from "@/lib/report/magazzino-analytics";
import { fire, makeCandidate, skipFalse, skipMissing } from "@/lib/report/insights/rules/rule-helpers";

export const MAGAZZINO_INSIGHT_RULES: InsightRuleDefinition[] = [
  {
    ruleKey: "MAG_LOW_STOCK",
    ruleVersion: 1,
    domain: "magazzino",
    severity: "warning",
    priority: 18,
    applicability: "active",
    metricIds: ["scorta"],
    drillDown: { metricId: "scorta", targetSection: "magazzino_ricambi", targetTab: "scorta" },
    evaluate(ctx) {
      const mag = ctx.signals.magazzino;
      if (!mag) return skipMissing(this);
      if (mag.lowStock <= 0) return skipFalse(this);
      return fire(makeCandidate(this, { count: mag.lowStock }));
    },
  },
  {
    ruleKey: "MAG_COVERAGE_CRITICAL",
    ruleVersion: 1,
    domain: "magazzino",
    severity: "warning",
    priority: 16,
    applicability: "active",
    metricIds: ["scorta"],
    drillDown: { metricId: "scorta", targetSection: "magazzino_ricambi" },
    evaluate(ctx) {
      const mag = ctx.signals.magazzino;
      if (!mag) return skipMissing(this);
      if (mag.coverageCritical <= 0) return skipFalse(this);
      return fire(makeCandidate(this, { count: mag.coverageCritical, days: MAG_COVERAGE_CRITICAL_DAYS }));
    },
  },
  {
    ruleKey: "MAG_DEAD_STOCK",
    ruleVersion: 1,
    domain: "magazzino",
    severity: "info",
    priority: 10,
    applicability: "active",
    metricIds: ["scorta"],
    drillDown: { metricId: "scorta", targetSection: "magazzino_ricambi" },
    evaluate(ctx) {
      const mag = ctx.signals.magazzino;
      if (!mag) return skipMissing(this);
      if (mag.deadStock <= 0) return skipFalse(this);
      return fire(makeCandidate(this, { count: mag.deadStock }));
    },
  },
  {
    ruleKey: "MAG_PARTS_SPIKE",
    ruleVersion: 1,
    domain: "magazzino",
    severity: "warning",
    priority: 14,
    applicability: "active",
    metricIds: ["ric-usati"],
    drillDown: { metricId: "ric-usati", targetSection: "magazzino_ricambi" },
    evaluate(ctx) {
      const mag = ctx.signals.magazzino;
      if (!mag?.spike) return skipMissing(this);
      const { current, avgPrev } = mag.spike;
      if (avgPrev <= 0 || current <= avgPrev * MAG_PARTS_SPIKE_RATIO) return skipFalse(this);
      return fire(makeCandidate(this, { current, avgPrev, ratio: MAG_PARTS_SPIKE_RATIO }));
    },
  },
];
