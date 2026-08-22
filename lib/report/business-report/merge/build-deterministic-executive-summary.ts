import type { BusinessReportRuntimeContext } from "@/lib/report/business-report/context/build-business-report-context";
import type {
  BusinessReport,
  BusinessReportDomainBrief,
  BusinessReportInsightItem,
} from "@/lib/report/business-report/types";
import {
  buildDomainPeriodBriefs,
  formatDomainBriefsAsSummaryLines,
} from "@/lib/report/business-report/analysis/build-domain-period-briefs";
import { formatReportMetricValue } from "@/lib/report/metrics/format-report-metric-value";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import { resolveEnvelopeCompareDeltaPercent } from "@/lib/report/business-report/metrics/resolve-envelope-compare-delta";

const LEGACY_UNAVAILABLE_SUMMARY = /interpretazione ai non disponibile/i;

export function isLegacyUnavailableExecutiveSummary(summary: string): boolean {
  return LEGACY_UNAVAILABLE_SUMMARY.test(summary);
}

function buildLines(
  metrics: readonly ReportMetricEnvelope[],
  buckets: {
    highlights: readonly BusinessReportInsightItem[];
    concerns: readonly BusinessReportInsightItem[];
    anomalies: readonly BusinessReportInsightItem[];
  },
  domainBriefs: readonly BusinessReportDomainBrief[],
): string {
  const lines: string[] = ["Sintesi automatica dai dati certificati del periodo."];

  const domainLines = formatDomainBriefsAsSummaryLines(domainBriefs);
  if (domainLines.length) {
    lines.push("", "Analisi per area:");
    lines.push(...domainLines.map((l) => `• ${l}`));
  }

  for (const env of metrics.filter((m) => m.trust !== "not_available").slice(0, 4)) {
    const reg = getRegistryEntry(env.metricId);
    const label = reg?.label ?? env.metricId;
    const value = formatReportMetricValue(env.metric.value, reg?.formatter ?? reg?.unit ?? "count");
    const delta = resolveEnvelopeCompareDeltaPercent(env);
    const deltaLabel =
      delta != null && Number.isFinite(delta) ? ` (${delta > 0 ? "+" : ""}${delta.toFixed(1)}% vs confronto)` : "";
    lines.push(`• ${label}: ${value}${deltaLabel}`);
  }

  const { highlights, concerns, anomalies } = buckets;
  const parts: string[] = [];
  if (highlights.length) parts.push(`${highlights.length} segnali positivi`);
  if (concerns.length) parts.push(`${concerns.length} criticità`);
  if (anomalies.length) parts.push(`${anomalies.length} anomalie`);
  if (parts.length) lines.push(`Insight: ${parts.join(", ")}.`);

  const topConcern = concerns[0] ?? anomalies[0];
  if (topConcern) {
    lines.push(`Priorità: ${topConcern.title} — ${topConcern.explanation}`);
  } else if (highlights[0]) {
    lines.push(`In evidenza: ${highlights[0].title} — ${highlights[0].explanation}`);
  }

  return lines.join("\n");
}

function resolveDomainBriefs(
  metrics: readonly ReportMetricEnvelope[],
  buckets: {
    highlights: readonly BusinessReportInsightItem[];
    concerns: readonly BusinessReportInsightItem[];
    anomalies: readonly BusinessReportInsightItem[];
  },
  provided?: readonly BusinessReportDomainBrief[],
): BusinessReportDomainBrief[] {
  if (provided?.length) return [...provided];
  return buildDomainPeriodBriefs({
    metrics,
    highlights: buckets.highlights,
    concerns: buckets.concerns,
    anomalies: buckets.anomalies,
  });
}

/** Sintesi leggibile senza LLM — metriche certificate + insight classificati. */
export function buildDeterministicExecutiveSummary(
  ctx: BusinessReportRuntimeContext,
  domainBriefs?: readonly BusinessReportDomainBrief[],
): string {
  const briefs = resolveDomainBriefs(ctx.analytics.metrics, ctx.buckets, domainBriefs);
  return buildLines(ctx.analytics.metrics, ctx.buckets, briefs);
}

export function buildDeterministicExecutiveSummaryFromReport(
  report: Pick<BusinessReport, "kpis" | "highlights" | "concerns" | "anomalies" | "domainBriefs">,
): string {
  const briefs = resolveDomainBriefs(
    report.kpis,
    {
      highlights: report.highlights,
      concerns: report.concerns,
      anomalies: report.anomalies,
    },
    report.domainBriefs,
  );
  return buildLines(report.kpis, {
    highlights: report.highlights,
    concerns: report.concerns,
    anomalies: report.anomalies,
  }, briefs);
}

export function buildDomainBriefsFromReport(
  report: Pick<BusinessReport, "kpis" | "highlights" | "concerns" | "anomalies" | "domainBriefs">,
): BusinessReportDomainBrief[] {
  if (report.domainBriefs?.length) return report.domainBriefs;
  return buildDomainPeriodBriefs({
    metrics: report.kpis,
    highlights: report.highlights,
    concerns: report.concerns,
    anomalies: report.anomalies,
  });
}

/** Report in cache con copy legacy → sintesi e domain briefs al volo (no rigenerazione). */
export function hydrateBusinessReportForDisplay(report: BusinessReport): BusinessReport {
  const domainBriefs = buildDomainBriefsFromReport(report);
  const needsSummary =
    report.aiStatus === "unavailable" && isLegacyUnavailableExecutiveSummary(report.executiveSummary);
  const needsBriefs = !report.domainBriefs?.length && domainBriefs.length > 0;

  if (!needsSummary && !needsBriefs) return report;

  return {
    ...report,
    domainBriefs: needsBriefs ? domainBriefs : report.domainBriefs,
    executiveSummary: needsSummary
      ? buildDeterministicExecutiveSummaryFromReport({ ...report, domainBriefs })
      : report.executiveSummary,
  };
}
