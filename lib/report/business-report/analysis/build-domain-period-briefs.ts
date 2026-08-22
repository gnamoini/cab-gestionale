import type {
  BusinessReportDomainBrief,
  BusinessReportInsightItem,
  DomainPeriodInsightWatch,
  DomainPeriodMetricChange,
} from "@/lib/report/business-report/types";
import { resolveEnvelopeCompareDeltaPercent } from "@/lib/report/business-report/metrics/resolve-envelope-compare-delta";
import { formatReportMetricValue } from "@/lib/report/metrics/format-report-metric-value";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import { getReportBusinessLabel } from "@/lib/report/ui/report-business-labels";

const DELTA_THRESHOLD_PERCENT = 2;

export const BUSINESS_REPORT_DOMAIN_DEFS = [
  { id: "lavorazioni", title: "Lavorazioni e tempi" },
  { id: "operai", title: "Operatori e ore lavorate" },
  { id: "ricambi", title: "Ricambi e magazzino" },
  { id: "mezzi", title: "Mezzi e flotta" },
  { id: "clienti", title: "Clienti" },
  { id: "preventivi", title: "Preventivi" },
  { id: "economia", title: "Incassi e fatturato" },
] as const;

export type BusinessReportDomainId = (typeof BUSINESS_REPORT_DOMAIN_DEFS)[number]["id"];

const METRIC_DOMAIN: Readonly<Record<string, BusinessReportDomainId>> = {
  "lav-chiusi": "lavorazioni",
  "lav-periodo": "lavorazioni",
  "lav-aperti": "lavorazioni",
  lav_late_sla: "lavorazioni",
  "lav-tempo": "lavorazioni",
  lav_cancelled: "lavorazioni",
  "lav-ricavi": "lavorazioni",
  "lav-costi": "lavorazioni",
  presence_hours_total: "operai",
  actual_labor_hours_total: "operai",
  ore_straordinari: "operai",
  saturazione_team: "operai",
  ore_per_job: "operai",
  actual_hours_per_job: "operai",
  cross_efficiency: "operai",
  "ric-usati": "ricambi",
  scorta: "ricambi",
  cap: "ricambi",
  mag_movement_value: "ricambi",
  mag_orders: "ricambi",
  cross_parts_job: "ricambi",
  "flotta-officina": "mezzi",
  clienti: "clienti",
  eco_preventivi: "preventivi",
  eco_preventivi_approvati: "preventivi",
  eco_preventivi_valore: "preventivi",
  win_rate_preventivi: "preventivi",
  eco_fatturato: "economia",
  eco_incassato: "economia",
  eco_da_incassare: "economia",
  eco_importo_scaduto: "economia",
  eco_margine_operativo_stimato: "economia",
  eco_ddt: "economia",
  cross_value_hour: "economia",
  cross_cost_job: "economia",
};

const HIGHER_IS_BETTER = new Set([
  "lav-chiusi",
  "eco_fatturato",
  "eco_incassato",
  "eco_margine_operativo_stimato",
  "clienti",
  "eco_preventivi",
  "eco_preventivi_approvati",
  "eco_preventivi_valore",
  "win_rate_preventivi",
  "lav-ricavi",
  "cross_efficiency",
  "cross_value_hour",
  "mag_movement_value",
]);

const LOWER_IS_BETTER = new Set([
  "lav-aperti",
  "lav_late_sla",
  "lav-tempo",
  "lav_cancelled",
  "lav-costi",
  "eco_da_incassare",
  "eco_importo_scaduto",
  "scorta",
  "ore_straordinari",
  "flotta-officina",
  "cross_cost_job",
  "cross_parts_job",
]);

/** Snapshot senza confronto ma utili per attenzione operativa. */
const SNAPSHOT_ATTENTION_METRICS = new Set([
  "lav-aperti",
  "lav_late_sla",
  "scorta",
  "eco_da_incassare",
  "eco_importo_scaduto",
  "flotta-officina",
  "saturazione_team",
  "ore_straordinari",
]);

function metricLabel(metricId: string): string {
  const business = getReportBusinessLabel(metricId);
  if (business?.title) return business.title;
  return getRegistryEntry(metricId)?.label ?? metricId;
}

function formatDeltaLabel(delta: number | null): string | null {
  if (delta == null || !Number.isFinite(delta)) return null;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}% vs confronto`;
}

function toMetricChange(env: ReportMetricEnvelope): DomainPeriodMetricChange {
  const reg = getRegistryEntry(env.metricId);
  const delta = resolveEnvelopeCompareDeltaPercent(env);
  return {
    metricId: env.metricId,
    label: metricLabel(env.metricId),
    value: formatReportMetricValue(env.metric.value, reg?.formatter ?? reg?.unit ?? "count"),
    deltaPercent: delta,
    deltaLabel: formatDeltaLabel(delta),
  };
}

function classifyDelta(metricId: string, delta: number): "improved" | "worsened" | "stable" {
  if (Math.abs(delta) < DELTA_THRESHOLD_PERCENT) return "stable";
  if (HIGHER_IS_BETTER.has(metricId)) return delta > 0 ? "improved" : "worsened";
  if (LOWER_IS_BETTER.has(metricId)) return delta < 0 ? "improved" : "worsened";
  return "stable";
}

export function resolveMetricDomain(metricId: string): BusinessReportDomainId | null {
  return METRIC_DOMAIN[metricId] ?? null;
}

export function resolveInsightDomain(ruleKey: string, metricIds: readonly string[]): BusinessReportDomainId {
  if (ruleKey.startsWith("LAV_")) return "lavorazioni";
  if (ruleKey.startsWith("ORE_")) return "operai";
  if (ruleKey.startsWith("MAG_")) return "ricambi";
  if (ruleKey.startsWith("COMP_")) return "mezzi";
  if (ruleKey.startsWith("ECO_")) {
    if (/PREV|QUOTE|WIN/i.test(ruleKey)) return "preventivi";
    return "economia";
  }
  if (ruleKey.startsWith("CROSS_")) {
    if (ruleKey.includes("PARTS")) return "ricambi";
    if (ruleKey.includes("COST") || ruleKey.includes("VALUE")) return "economia";
    return "operai";
  }
  for (const id of metricIds) {
    const domain = resolveMetricDomain(id);
    if (domain) return domain;
  }
  return "lavorazioni";
}

function insightToWatch(item: BusinessReportInsightItem): DomainPeriodInsightWatch {
  return {
    ruleKey: item.ruleKey,
    title: item.title,
    explanation: item.aiExplanation ?? item.explanation,
    severity: item.severity,
  };
}

function emptyBrief(domainId: BusinessReportDomainId, title: string): BusinessReportDomainBrief {
  return {
    domainId,
    title,
    improved: [],
    worsened: [],
    snapshots: [],
    watch: [],
  };
}

export function buildDomainPeriodBriefs(input: {
  metrics: readonly ReportMetricEnvelope[];
  highlights: readonly BusinessReportInsightItem[];
  concerns: readonly BusinessReportInsightItem[];
  anomalies: readonly BusinessReportInsightItem[];
}): BusinessReportDomainBrief[] {
  const byDomain = new Map<BusinessReportDomainId, BusinessReportDomainBrief>(
    BUSINESS_REPORT_DOMAIN_DEFS.map((d) => [d.id, emptyBrief(d.id, d.title)]),
  );

  for (const env of input.metrics) {
    if (env.trust === "not_available") continue;
    const domainId = resolveMetricDomain(env.metricId);
    if (!domainId) continue;

    const brief = byDomain.get(domainId)!;
    const change = toMetricChange(env);
    const delta = change.deltaPercent;

    if (delta != null && Number.isFinite(delta)) {
      const trend = classifyDelta(env.metricId, delta);
      if (trend === "improved") brief.improved.push(change);
      else if (trend === "worsened") brief.worsened.push(change);
    } else if (SNAPSHOT_ATTENTION_METRICS.has(env.metricId)) {
      brief.snapshots.push(change);
    }
  }

  const watchItems = [...input.concerns, ...input.anomalies, ...input.highlights];
  const seenWatch = new Set<string>();
  for (const item of watchItems) {
    const domainId = resolveInsightDomain(item.ruleKey, item.metricIds);
    const key = `${domainId}:${item.ruleKey}`;
    if (seenWatch.has(key)) continue;
    seenWatch.add(key);
    byDomain.get(domainId)!.watch.push(insightToWatch(item));
  }

  const sortByAbsDelta = (a: DomainPeriodMetricChange, b: DomainPeriodMetricChange) =>
    Math.abs(b.deltaPercent ?? 0) - Math.abs(a.deltaPercent ?? 0);

  return BUSINESS_REPORT_DOMAIN_DEFS.map((d) => {
    const brief = byDomain.get(d.id)!;
    brief.improved.sort(sortByAbsDelta);
    brief.worsened.sort(sortByAbsDelta);
    return brief;
  }).filter(
    (b) => b.improved.length > 0 || b.worsened.length > 0 || b.snapshots.length > 0 || b.watch.length > 0,
  );
}

export function formatDomainBriefsAsSummaryLines(briefs: readonly BusinessReportDomainBrief[]): string[] {
  const lines: string[] = [];
  for (const brief of briefs) {
    const parts: string[] = [];
    if (brief.improved.length) {
      parts.push(
        `migliorato: ${brief.improved
          .slice(0, 2)
          .map((m) => `${m.label}${m.deltaLabel ? ` (${m.deltaLabel})` : ""}`)
          .join(", ")}`,
      );
    }
    if (brief.worsened.length) {
      parts.push(
        `peggiorato: ${brief.worsened
          .slice(0, 2)
          .map((m) => `${m.label}${m.deltaLabel ? ` (${m.deltaLabel})` : ""}`)
          .join(", ")}`,
      );
    }
    if (brief.watch.length) {
      parts.push(`attenzione: ${brief.watch[0]!.title}`);
    }
    if (parts.length) lines.push(`${brief.title}: ${parts.join("; ")}.`);
  }
  return lines;
}
