import type { OperationalBriefOutput } from "@/lib/operational-intelligence/types";
import { answerOperationalBriefQuestion } from "@/lib/operational-intelligence/assistant/answer-operational-brief-question";

export type OperationalAssistantInput = {
  question: string;
  brief: OperationalBriefOutput;
  previousBrief?: OperationalBriefOutput | null;
};

export type OperationalAssistantResult = {
  answer: string;
  confidence: "high" | "medium" | "low";
  evidence: string[];
};

export function runOperationalAssistant(input: OperationalAssistantInput): OperationalAssistantResult {
  return answerOperationalBriefQuestion(input.question, input.brief, input.previousBrief);
}

export { answerOperationalBriefQuestion };
