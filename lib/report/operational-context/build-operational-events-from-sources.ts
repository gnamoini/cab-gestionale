import { randomUUID } from "node:crypto";
import type { OperationalDiaryEntry } from "@/lib/operational-intelligence/types";
import type { FactEngineOutput } from "@/lib/operational-intelligence/facts/build-fact-engine";
import { buildOperationalEvents } from "@/lib/operational-intelligence/events/build-operational-events";
import type { BusinessReportCorrelationRef, BusinessReportEventRef } from "@/lib/report/business-report/types";
import { buildReportCorrelationsLegacy } from "@/lib/report/operational-context/build-report-correlations-legacy";
import type { InsightDto } from "@/lib/report/insights/types";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";

/** P4-frozen events + legacy correlations from shared sources. */
export function buildOperationalEventsFromSources(input: {
  insights: InsightDto[];
  classifiedDiary: OperationalDiaryEntry[];
  facts: FactEngineOutput;
  envelopesById: Map<string, ReportMetricEnvelope>;
}): {
  events: BusinessReportEventRef[];
  correlations: BusinessReportCorrelationRef[];
} {
  const opEvents = buildOperationalEvents(input.insights, input.classifiedDiary, input.facts);
  const events: BusinessReportEventRef[] = opEvents.slice(0, 6).map((e) => ({
    id: e.id || randomUUID(),
    headline: e.headline,
    source: e.source === "user" ? "diary" : e.source,
    metricIds: e.metricIds,
    insightRuleKeys: e.evidence?.flatMap((ev) => (ev.kind === "insight" ? [ev.ruleKey] : [])),
  }));

  const correlations = buildReportCorrelationsLegacy({
    insights: input.insights,
    events,
    envelopesById: input.envelopesById,
  });

  return { events, correlations };
}
