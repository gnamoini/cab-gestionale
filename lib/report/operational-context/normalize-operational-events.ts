import type { InsightDto } from "@/lib/report/insights/types";
import type { OperationalDiaryEntry } from "@/lib/operational-intelligence/types";
import type { ReportOperationalEvent } from "@/lib/report/operational-context/types";
import type { BusinessReportEventRef } from "@/lib/report/business-report/types";
import {
  classifyEventSeverity,
  resolveTimelineFilterCategory,
} from "@/lib/report/operational-context/classify-operational-event";

function mapInsightEvent(insight: InsightDto, timestamp: string): ReportOperationalEvent {
  return {
    id: `insight:${insight.ruleKey}:${insight.id}`,
    timestamp,
    type: "insight",
    title: insight.message,
    severity: classifyEventSeverity({
      type: "insight",
      insightRuleKey: insight.ruleKey,
      insightSeverity: insight.severity,
    }),
    metricIds: [...insight.metricIds],
    insightRuleKeys: [insight.ruleKey],
    source: { kind: "deterministic", sourceId: insight.ruleKey },
    filterCategory: "insight",
  };
}

function mapDiaryEvent(entry: OperationalDiaryEntry): ReportOperationalEvent {
  return {
    id: `diary:${entry.id ?? entry.workDate}:${entry.text.slice(0, 24)}`,
    timestamp: `${entry.workDate}T12:00:00.000Z`,
    type: "diary",
    title: entry.text.slice(0, 120),
    summary: entry.category,
    severity: classifyEventSeverity({ type: "diary", diaryCategory: entry.category }),
    source: { kind: "diary", sourceId: entry.id ?? entry.workDate },
    filterCategory: "notes",
  };
}

function mapBusinessEvent(ref: BusinessReportEventRef, timestamp: string): ReportOperationalEvent {
  return {
    id: ref.id,
    timestamp,
    type: ref.source === "diary" ? "diary" : "system",
    title: ref.headline,
    severity: classifyEventSeverity({
      type: "system",
      insightRuleKey: ref.insightRuleKeys?.[0],
    }),
    metricIds: ref.metricIds ? [...ref.metricIds] : undefined,
    insightRuleKeys: ref.insightRuleKeys ? [...ref.insightRuleKeys] : undefined,
    source: {
      kind: ref.source === "diary" ? "diary" : "deterministic",
      sourceId: ref.id,
    },
    filterCategory: resolveTimelineFilterCategory(ref.source === "diary" ? "diary" : "system"),
  };
}

export function normalizeOperationalEvents(input: {
  insights: InsightDto[];
  classifiedDiary: OperationalDiaryEntry[];
  businessEvents: BusinessReportEventRef[];
  periodEndYmd: string;
}): ReportOperationalEvent[] {
  const rows: ReportOperationalEvent[] = [];
  for (const ins of input.insights) {
    rows.push(mapInsightEvent(ins, `${input.periodEndYmd}T23:59:59.000Z`));
  }
  for (const d of input.classifiedDiary) {
    rows.push(mapDiaryEvent(d));
  }
  for (const e of input.businessEvents) {
    rows.push(mapBusinessEvent(e, `${input.periodEndYmd}T12:00:00.000Z`));
  }
  return rows.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
