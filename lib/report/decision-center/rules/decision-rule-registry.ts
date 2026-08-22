import type { InsightDto } from "@/lib/report/insights/types";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import type { ReportOperationalEvent } from "@/lib/report/operational-context/types";
import { resolveEnvelopeCompareDeltaPercent } from "@/lib/report/business-report/metrics/resolve-envelope-compare-delta";
import type {
  DecisionCategory,
  DecisionEntityRef,
  DecisionPriority,
} from "@/lib/report/decision-center/types";
import type { ReportMetricEnvelopeTrust } from "@/lib/report/metrics/report-metric-envelope";

export type DecisionRuleKey =
  | "BACKLOG_ESCALATION"
  | "STOCK_REORDER_REVIEW"
  | "CUSTOMER_REVENUE_DROP"
  | "MARGIN_PRESSURE"
  | "LABOR_CAPACITY_PRESSURE"
  | "CASH_COLLECTION_ATTENTION";

export type DecisionRuleDefinition = {
  ruleKey: DecisionRuleKey;
  category: DecisionCategory;
  requiredMetricIds: readonly string[];
  requiredInsightRuleKeys?: readonly string[];
  minimumTrust: ReportMetricEnvelopeTrust;
  basePriority: DecisionPriority;
  evaluate: (ctx: DecisionRuleContext) => DecisionRuleMatch | null;
};

export type DecisionRuleContext = {
  envelopesById: Map<string, ReportMetricEnvelope>;
  insights: InsightDto[];
  summaryEvents: ReportOperationalEvent[];
  periodKey: string;
};

export type DecisionRuleMatch = {
  title: string;
  summary: string;
  rationale: string;
  metricIds: string[];
  insightRuleKeys: string[];
  eventIds: string[];
  entity?: DecisionEntityRef;
};

const TRUST_RANK: Record<ReportMetricEnvelopeTrust, number> = {
  verified: 4,
  estimated: 3,
  partial: 2,
  not_available: 0,
};

const MIN_TRUST_RANK: Record<ReportMetricEnvelopeTrust, number> = {
  verified: 4,
  estimated: 3,
  partial: 2,
  not_available: 1,
};

function trustMeets(env: ReportMetricEnvelope | undefined, min: ReportMetricEnvelopeTrust): boolean {
  if (!env) return false;
  return TRUST_RANK[env.trust] >= MIN_TRUST_RANK[min];
}

function hasInsight(insights: InsightDto[], keys: readonly string[]): boolean {
  const set = new Set(keys);
  return insights.some((i) => set.has(i.ruleKey));
}

function deltaUp(env: ReportMetricEnvelope | undefined, threshold: number): boolean {
  const d = env ? resolveEnvelopeCompareDeltaPercent(env) : null;
  return d != null && d >= threshold;
}

function deltaDown(env: ReportMetricEnvelope | undefined, threshold: number): boolean {
  const d = env ? resolveEnvelopeCompareDeltaPercent(env) : null;
  return d != null && d <= -threshold;
}

export const DECISION_RULE_REGISTRY: DecisionRuleDefinition[] = [
  {
    ruleKey: "BACKLOG_ESCALATION",
    category: "operational",
    requiredMetricIds: ["lav-aperti", "lav_late_sla"],
    requiredInsightRuleKeys: ["LAV_OPEN_BACKLOG", "LAV_SLA_BREACH"],
    minimumTrust: "partial",
    basePriority: "high",
    evaluate(ctx) {
      const aperti = ctx.envelopesById.get("lav-aperti");
      const sla = ctx.envelopesById.get("lav_late_sla");
      if (!trustMeets(aperti, "partial") && !trustMeets(sla, "partial")) return null;
      const insightOk =
        hasInsight(ctx.insights, ["LAV_OPEN_BACKLOG", "LAV_SLA_BREACH"]) ||
        deltaUp(aperti, 10) ||
        deltaUp(sla, 5);
      if (!insightOk) return null;
      return {
        title: "Verificare capacità e lavorazioni in ritardo",
        summary: "Troppe lavorazioni aperte o oltre il termine previsto",
        rationale:
          "Rispetto al periodo di confronto, aumentano le lavorazioni ancora da completare o quelle oltre il termine previsto.",
        metricIds: ["lav-aperti", "lav_late_sla"].filter((id) => ctx.envelopesById.has(id)),
        insightRuleKeys: ctx.insights
          .filter((i) => ["LAV_OPEN_BACKLOG", "LAV_SLA_BREACH"].includes(i.ruleKey))
          .map((i) => i.ruleKey),
        eventIds: ctx.summaryEvents
          .filter((e) => e.metricIds?.some((m) => m === "lav-aperti" || m === "lav_late_sla"))
          .map((e) => e.id)
          .slice(0, 4),
      };
    },
  },
  {
    ruleKey: "STOCK_REORDER_REVIEW",
    category: "inventory",
    requiredMetricIds: ["scorta", "ric-usati"],
    requiredInsightRuleKeys: ["MAG_LOW_STOCK", "MAG_PARTS_SPIKE"],
    minimumTrust: "partial",
    basePriority: "high",
    evaluate(ctx) {
      const scorta = ctx.envelopesById.get("scorta");
      const consumi = ctx.envelopesById.get("ric-usati");
      if (!trustMeets(scorta, "partial") && !trustMeets(consumi, "partial")) return null;
      const insightOk =
        hasInsight(ctx.insights, ["MAG_LOW_STOCK", "MAG_PARTS_SPIKE"]) ||
        deltaUp(consumi, 15);
      if (!insightOk) return null;
      const entityEvent = ctx.summaryEvents.find((e) => e.entity?.type === "ricambio");
      return {
        title: entityEvent?.entity?.label
          ? `Valutare revisione soglia di riordino — ${entityEvent.entity.label}`
          : "Valutare revisione soglia di riordino",
        summary: "Consumi in aumento con stock sotto soglia",
        rationale: "Consumi in crescita e/o segnali di scorta bassa nel periodo.",
        metricIds: ["scorta", "ric-usati"].filter((id) => ctx.envelopesById.has(id)),
        insightRuleKeys: ctx.insights
          .filter((i) => ["MAG_LOW_STOCK", "MAG_PARTS_SPIKE"].includes(i.ruleKey))
          .map((i) => i.ruleKey),
        eventIds: ctx.summaryEvents
          .filter((e) => e.metricIds?.some((m) => m === "scorta" || m === "ric-usati"))
          .map((e) => e.id)
          .slice(0, 4),
        entity: entityEvent?.entity?.id
          ? { dimension: "ricambio", entityId: entityEvent.entity.id }
          : undefined,
      };
    },
  },
  {
    ruleKey: "CUSTOMER_REVENUE_DROP",
    category: "customer",
    requiredMetricIds: ["eco_fatturato"],
    minimumTrust: "verified",
    basePriority: "medium",
    evaluate(ctx) {
      const fatt = ctx.envelopesById.get("eco_fatturato");
      if (!trustMeets(fatt, "verified")) return null;
      if (!deltaDown(fatt, 8) && !hasInsight(ctx.insights, ["ECO_REVENUE_DROP", "ECO_INVOICES_PENDING"])) {
        return null;
      }
      const clienteEvent = ctx.summaryEvents.find((e) => e.entity?.type === "cliente");
      return {
        title: clienteEvent?.entity?.label
          ? `Valutare attenzione sul cliente ${clienteEvent.entity.label}`
          : "Valutare attenzione su clienti con fatturato in calo",
        summary: "Fatturato cliente/periodo in calo",
        rationale: "Trend negativo sul fatturato nel periodo di confronto.",
        metricIds: ["eco_fatturato"],
        insightRuleKeys: ctx.insights
          .filter((i) => i.metricIds.includes("eco_fatturato"))
          .map((i) => i.ruleKey)
          .slice(0, 3),
        eventIds: ctx.summaryEvents
          .filter((e) => e.metricIds?.includes("eco_fatturato"))
          .map((e) => e.id)
          .slice(0, 4),
        entity: clienteEvent?.entity?.id
          ? { dimension: "cliente", entityId: clienteEvent.entity.id }
          : undefined,
      };
    },
  },
  {
    ruleKey: "MARGIN_PRESSURE",
    category: "economic",
    requiredMetricIds: ["eco_margine_operativo_stimato"],
    minimumTrust: "estimated",
    basePriority: "medium",
    evaluate(ctx) {
      const marg = ctx.envelopesById.get("eco_margine_operativo_stimato");
      if (!trustMeets(marg, "estimated")) return null;
      if (!deltaDown(marg, 5)) return null;
      return {
        title: "Valutare pressione sul margine operativo stimato",
        summary: "Margine operativo in calo nel periodo",
        rationale: "Il margine operativo stimato è peggiorato rispetto al confronto.",
        metricIds: ["eco_margine_operativo_stimato"],
        insightRuleKeys: ctx.insights
          .filter((i) => i.metricIds.includes("eco_margine_operativo_stimato"))
          .map((i) => i.ruleKey)
          .slice(0, 2),
        eventIds: [],
      };
    },
  },
  {
    ruleKey: "LABOR_CAPACITY_PRESSURE",
    category: "resource",
    requiredMetricIds: ["presence_hours_total", "lav-periodo"],
    minimumTrust: "partial",
    basePriority: "medium",
    evaluate(ctx) {
      const ore = ctx.envelopesById.get("presence_hours_total");
      const lav = ctx.envelopesById.get("lav-periodo");
      if (!trustMeets(ore, "partial") && !trustMeets(lav, "partial")) return null;
      if (!deltaUp(ore, 10) && !deltaUp(lav, 10)) return null;
      return {
        title: "Valutare capacità officina e carico lavorazioni",
        summary: "Ore o throughput in aumento",
        rationale: "Segnali di pressione su capacità o volume lavorazioni.",
        metricIds: ["presence_hours_total", "lav-periodo"].filter((id) => ctx.envelopesById.has(id)),
        insightRuleKeys: ctx.insights
          .filter((i) => i.metricIds.some((m) => m === "presence_hours_total" || m === "lav-periodo"))
          .map((i) => i.ruleKey)
          .slice(0, 2),
        eventIds: [],
      };
    },
  },
  {
    ruleKey: "CASH_COLLECTION_ATTENTION",
    category: "economic",
    requiredMetricIds: ["eco_da_incassare", "eco_incassato"],
    minimumTrust: "verified",
    basePriority: "high",
    evaluate(ctx) {
      const daInc = ctx.envelopesById.get("eco_da_incassare");
      const inc = ctx.envelopesById.get("eco_incassato");
      if (!trustMeets(daInc, "verified")) return null;
      if (!deltaUp(daInc, 8) && !deltaDown(inc, 5)) return null;
      return {
        title: "Valutare attenzione su incassi e residuo da incassare",
        summary: "Residuo da incassare in aumento o incassi in calo",
        rationale: "Segnali di tensione sulla cassa nel periodo.",
        metricIds: ["eco_da_incassare", "eco_incassato"].filter((id) => ctx.envelopesById.has(id)),
        insightRuleKeys: ctx.insights
          .filter((i) => i.metricIds.some((m) => m === "eco_da_incassare" || m === "eco_incassato"))
          .map((i) => i.ruleKey)
          .slice(0, 2),
        eventIds: [],
      };
    },
  },
];

export function listDecisionRuleMetricIds(): string[] {
  const set = new Set<string>();
  for (const rule of DECISION_RULE_REGISTRY) {
    for (const id of rule.requiredMetricIds) set.add(id);
  }
  return [...set].sort();
}
