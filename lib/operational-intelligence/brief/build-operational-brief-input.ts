import { createHash } from "node:crypto";
import type { ReportAIContextDto } from "@/lib/report/ai-context/types";
import type { FactEngineOutput } from "@/lib/operational-intelligence/facts/build-fact-engine";
import type {
  OperationalBriefScore,
  OperationalDiaryEntry,
  OperationalEvent,
} from "@/lib/operational-intelligence/types";
import type { OperationalPeriod } from "@/lib/operational-intelligence/period/types";
import type { ReportInsightsDto } from "@/lib/report/insights/types";

export type OperationalBriefInput = {
  contractVersion: "1";
  period: OperationalPeriod;
  briefScore: OperationalBriefScore;
  facts: FactEngineOutput;
  events: OperationalEvent[];
  insights: ReportInsightsDto;
  aiContext: ReportAIContextDto;
  diary: OperationalDiaryEntry[];
  insightMessages: { ruleKey: string; message: string; severity: string }[];
};

export function buildOperationalBriefInput(input: {
  period: OperationalPeriod;
  briefScore: OperationalBriefScore;
  facts: FactEngineOutput;
  events: OperationalEvent[];
  insights: ReportInsightsDto;
  aiContext: ReportAIContextDto;
  diary: OperationalDiaryEntry[];
}): OperationalBriefInput {
  const insightMessages = input.insights.insights.map((i) => ({
    ruleKey: i.ruleKey,
    message: i.message,
    severity: i.severity,
  }));

  return {
    contractVersion: "1",
    ...input,
    insightMessages,
  };
}

export function hashOperationalBriefInput(input: OperationalBriefInput): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 16);
}
