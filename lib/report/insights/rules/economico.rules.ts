import type { InsightRuleDefinition } from "@/lib/report/insights/insight-rule-types";
import { fire, makeCandidate, skipFalse, skipMissing } from "@/lib/report/insights/rules/rule-helpers";

const DSO_THRESHOLD_DAYS = 45;
const COLLECTION_RATE_MIN_PCT = 70;
const CONCENTRATION_MAX_PCT = 40;

export const ECONOMICO_INSIGHT_RULES: InsightRuleDefinition[] = [
  {
    ruleKey: "ECO_INVOICES_PENDING",
    ruleVersion: 1,
    domain: "economico",
    severity: "warning",
    priority: 22,
    applicability: "active",
    metricIds: ["eco_fatturato"],
    drillDown: { metricId: "eco_fatturato", targetSection: "dati_economici", targetTab: "fatture" },
    evaluate(ctx) {
      const eco = ctx.signals.economico;
      if (!eco) return skipMissing(this);
      if (eco.invoicesAvailable) return skipFalse(this);
      return fire(makeCandidate(this, {}, "AMBER"));
    },
  },
  {
    ruleKey: "ECO_RECEIVABLES",
    ruleVersion: 2,
    domain: "economico",
    severity: "warning",
    priority: 19,
    applicability: "active",
    metricIds: ["eco_da_incassare"],
    drillDown: { metricId: "eco_da_incassare", targetSection: "dati_economici", targetTab: "crediti" },
    evaluate(ctx) {
      const eco = ctx.signals.economico;
      if (!eco) return skipMissing(this);
      if (!eco.invoicesAvailable) return skipMissing(this);
      const overdue = eco.overdueAmount ?? 0;
      const dso = eco.dsoDays ?? 0;
      if (eco.receivables <= 0) return skipFalse(this);
      if (overdue <= 0 && dso <= DSO_THRESHOLD_DAYS) return skipFalse(this);
      const trust = eco.partialTrust ? "AMBER" : "GREEN";
      return fire(makeCandidate(this, { amount: eco.receivables, overdue }, trust));
    },
  },
  {
    ruleKey: "ECO_DSO_HIGH",
    ruleVersion: 1,
    domain: "economico",
    severity: "warning",
    priority: 18,
    applicability: "active",
    metricIds: ["eco_da_incassare"],
    drillDown: { metricId: "eco_da_incassare", targetSection: "dati_economici", targetTab: "crediti" },
    evaluate(ctx) {
      const eco = ctx.signals.economico;
      if (!eco?.invoicesAvailable) return skipMissing(this);
      const dso = eco.dsoDays ?? 0;
      if (dso <= DSO_THRESHOLD_DAYS) return skipFalse(this);
      return fire(makeCandidate(this, { days: dso, threshold: DSO_THRESHOLD_DAYS }, "AMBER"));
    },
  },
  {
    ruleKey: "ECO_COLLECTION_LOW",
    ruleVersion: 1,
    domain: "economico",
    severity: "warning",
    priority: 16,
    applicability: "active",
    metricIds: ["eco_fatturato"],
    drillDown: { metricId: "eco_fatturato", targetSection: "dati_economici", targetTab: "fatture" },
    evaluate(ctx) {
      const eco = ctx.signals.economico;
      if (!eco?.invoicesAvailable || eco.revenue <= 0) return skipFalse(this);
      const rate = eco.collectionRatePct;
      if (rate == null || rate >= COLLECTION_RATE_MIN_PCT) return skipFalse(this);
      return fire(makeCandidate(this, { rate, threshold: COLLECTION_RATE_MIN_PCT }, "AMBER"));
    },
  },
  {
    ruleKey: "ECO_MARGIN_NEGATIVE",
    ruleVersion: 1,
    domain: "economico",
    severity: "critical",
    priority: 21,
    applicability: "active",
    metricIds: ["eco_fatturato"],
    drillDown: { metricId: "eco_fatturato", targetSection: "dati_economici", targetTab: "fatture" },
    evaluate(ctx) {
      const eco = ctx.signals.economico;
      if (!eco?.invoicesAvailable) return skipMissing(this);
      const margin = eco.marginPct;
      if (margin == null || margin >= 0) return skipFalse(this);
      return fire(makeCandidate(this, { margin }, "RED"));
    },
  },
  {
    ruleKey: "ECO_CONCENTRATION_RISK",
    ruleVersion: 1,
    domain: "economico",
    severity: "info",
    priority: 12,
    applicability: "active",
    metricIds: ["eco_fatturato"],
    drillDown: { metricId: "eco_fatturato", targetSection: "dati_economici", targetTab: "fatture" },
    evaluate(ctx) {
      const eco = ctx.signals.economico;
      if (!eco?.invoicesAvailable || eco.revenue <= 0) return skipFalse(this);
      const share = eco.topClienteSharePct;
      const cliente = eco.topClienteLabel;
      if (share == null || cliente == null || share <= CONCENTRATION_MAX_PCT) return skipFalse(this);
      return fire(makeCandidate(this, { cliente, share, threshold: CONCENTRATION_MAX_PCT }));
    },
  },
];
