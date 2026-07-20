import { randomUUID } from "node:crypto";
import type { FactEngineOutput } from "@/lib/operational-intelligence/facts/build-fact-engine";
import type { OperationalDiaryEntry, OperationalEvent } from "@/lib/operational-intelligence/types";
import type { InsightDto } from "@/lib/report/insights/types";

function impactFromSeverity(severity: InsightDto["severity"]): OperationalEvent["impact"] {
  if (severity === "critical") return "high";
  if (severity === "warning") return "medium";
  return "low";
}

function eventTypeFromInsight(insight: InsightDto): OperationalEvent["type"] {
  if (insight.ruleKey.includes("SPIKE") || insight.ruleKey.includes("BREACH") || insight.severity === "critical") {
    return "anomaly";
  }
  if (insight.ruleKey.includes("LOW") || insight.ruleKey.includes("DROP")) {
    return "risk";
  }
  return "risk";
}

export function buildOperationalEvents(
  insights: InsightDto[],
  diary: OperationalDiaryEntry[],
  facts: FactEngineOutput,
): OperationalEvent[] {
  const events: OperationalEvent[] = [];

  for (const insight of insights.slice(0, 8)) {
    events.push({
      id: randomUUID(),
      type: eventTypeFromInsight(insight),
      impact: impactFromSeverity(insight.severity),
      source: "automatic",
      headline: insight.message,
      metricIds: insight.metricIds,
      evidence: [{ kind: "insight", ruleKey: insight.ruleKey, payload: {} }],
      confidence: insight.trust === "GREEN" ? "high" : "medium",
    });
  }

  for (const entry of diary.filter((d) => d.severity !== "low").slice(0, 3)) {
    events.push({
      id: randomUUID(),
      type: entry.category === "improvement" ? "improvement" : "risk",
      impact: entry.severity === "high" ? "high" : "medium",
      source: "diary",
      headline: entry.text.slice(0, 120),
      evidence: [{ kind: "diary", entryId: entry.id ?? entry.workDate, excerpt: entry.text.slice(0, 200) }],
      confidence: "medium",
    });
  }

  if (facts.metrics.lav_closed > facts.metrics.lav_opened && facts.metrics.lav_closed > 0) {
    events.push({
      id: randomUUID(),
      type: "improvement",
      impact: "medium",
      source: "automatic",
      headline: "Chiusure superiori alle aperture nel periodo",
      evidence: [
        {
          kind: "metric",
          metricId: "lav_closed",
          value: facts.metrics.lav_closed,
        },
      ],
      confidence: "high",
    });
  }

  return events.slice(0, 10);
}
