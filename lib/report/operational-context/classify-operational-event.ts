import type {
  ReportOperationalEventSeverity,
  ReportOperationalEventType,
} from "@/lib/report/operational-context/types";
import type { OperationalTimelineFilter } from "@/lib/report/operational-context/types";

const POSITIVE_RULE = /WIN|IMPROVE|CLOSED|COLLECTION_HIGH|CHIUS/i;
const ATTENTION_RULE = /SPIKE|BREACH|SLA|LATE|BACKLOG|LOW|DROP|HIGH|OPEN|SLOW/i;

export function classifyEventSeverity(input: {
  type: ReportOperationalEventType;
  insightRuleKey?: string;
  insightSeverity?: string;
  diaryCategory?: string;
}): ReportOperationalEventSeverity {
  const rule = input.insightRuleKey ?? "";
  if (input.type === "diary") {
    if (input.diaryCategory === "improvement") return "positive";
    if (input.diaryCategory === "warning" || input.diaryCategory === "issue") return "attention";
    return "neutral";
  }
  if (POSITIVE_RULE.test(rule)) return "positive";
  if (input.insightSeverity === "critical" || ATTENTION_RULE.test(rule)) return "attention";
  if (input.insightSeverity === "warning") return "attention";
  if (/DROP|LOW|BACKLOG|LATE|PEggior/i.test(rule)) return "negative";
  return "neutral";
}

export function resolveTimelineFilterCategory(type: ReportOperationalEventType): OperationalTimelineFilter {
  switch (type) {
    case "diary":
      return "notes";
    case "insight":
      return "insight";
    case "economic":
    case "commercial":
      return "economic";
    case "inventory":
      return "warehouse";
    case "work_order":
    case "system":
      return "operational";
    default:
      return "operational";
  }
}
