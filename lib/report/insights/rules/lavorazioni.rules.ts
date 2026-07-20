import type { InsightRuleDefinition } from "@/lib/report/insights/insight-rule-types";
import {
  fire,
  makeCandidate,
  skipDeferred,
  skipFalse,
  skipMissing,
} from "@/lib/report/insights/rules/rule-helpers";

const lavDrill = { metricId: "lav-aperti", targetSection: "lavorazioni" } as const;

export const LAVORAZIONI_INSIGHT_RULES: InsightRuleDefinition[] = [
  {
    ruleKey: "LAV_LOAD_EXCEEDS_CLOSURES",
    ruleVersion: 1,
    domain: "lavorazioni",
    severity: "warning",
    priority: 20,
    applicability: "active",
    metricIds: ["lav-periodo", "lav-chiusi"],
    drillDown: lavDrill,
    evaluate(ctx) {
      const lav = ctx.signals.lavorazioni;
      if (!lav) return skipMissing(this);
      if (lav.opened <= lav.closed) return skipFalse(this);
      return fire(
        makeCandidate(this, { opened: lav.opened, closed: lav.closed, delta: lav.opened - lav.closed }),
      );
    },
  },
  {
    ruleKey: "LAV_SLA_BREACH",
    ruleVersion: 1,
    domain: "lavorazioni",
    severity: "critical",
    priority: 30,
    applicability: "active",
    metricIds: ["lav_late_sla"],
    drillDown: { metricId: "lav_late_sla", targetSection: "lavorazioni", targetTab: "sla" },
    evaluate(ctx) {
      const lav = ctx.signals.lavorazioni;
      if (!lav) return skipMissing(this);
      if (lav.lateSla <= 0) return skipFalse(this);
      return fire(makeCandidate(this, { count: lav.lateSla }));
    },
  },
  {
    ruleKey: "LAV_OPEN_BACKLOG",
    ruleVersion: 2,
    domain: "lavorazioni",
    severity: "warning",
    priority: 15,
    applicability: "active",
    metricIds: ["lav-aperti"],
    drillDown: { metricId: "lav-aperti", targetSection: "lavorazioni", targetTab: "backlog" },
    evaluate(ctx) {
      const lav = ctx.signals.lavorazioni;
      if (!lav) return skipMissing(this);
      // ponytail: soglia dinamica — alert solo se backlog > 150% media storica 90gg (proxy: chiusure periodo)
      const threshold = Math.max(5, Math.ceil(lav.closed * 1.5));
      if (lav.open <= threshold) return skipFalse(this);
      return fire(makeCandidate(this, { open: lav.open, threshold }));
    },
  },
  {
    ruleKey: "LAV_LOW_CLOSURES",
    ruleVersion: 1,
    domain: "lavorazioni",
    severity: "info",
    priority: 8,
    applicability: "active",
    metricIds: ["lav-chiusi"],
    drillDown: { metricId: "lav-chiusi", targetSection: "lavorazioni" },
    evaluate(ctx) {
      const lav = ctx.signals.lavorazioni;
      if (!lav) return skipMissing(this);
      if (lav.closed > 0) return skipFalse(this);
      return fire(makeCandidate(this, { closed: 0 }));
    },
  },
  {
    ruleKey: "LAV_AVG_CLOSE_SLOW",
    ruleVersion: 1,
    domain: "lavorazioni",
    severity: "warning",
    priority: 12,
    applicability: "active",
    metricIds: ["lav-tempo"],
    drillDown: { metricId: "lav-tempo", targetSection: "lavorazioni" },
    evaluate(ctx) {
      const lav = ctx.signals.lavorazioni;
      if (!lav) return skipMissing(this);
      if (lav.avgCloseDays <= 14) return skipFalse(this);
      return fire(makeCandidate(this, { days: lav.avgCloseDays }));
    },
  },
  {
    ruleKey: "LAV_MANUAL_OVERRIDE",
    ruleVersion: 1,
    domain: "lavorazioni",
    severity: "info",
    priority: 5,
    applicability: "deferred",
    metricIds: ["lav-chiusi"],
    drillDown: { metricId: "lav-chiusi", targetSection: "lavorazioni" },
    evaluate() {
      return skipDeferred(this);
    },
  },
  {
    ruleKey: "LAV_CLOSURES_DELTA",
    ruleVersion: 1,
    domain: "lavorazioni",
    severity: "info",
    priority: 10,
    applicability: "deferred",
    metricIds: ["lav-chiusi"],
    drillDown: { metricId: "lav-chiusi", targetSection: "lavorazioni" },
    evaluate() {
      return skipDeferred(this);
    },
  },
];
