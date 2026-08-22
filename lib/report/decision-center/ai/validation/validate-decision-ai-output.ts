import { decisionAiOutputSchema, type DecisionAiOutput } from "@/lib/report/decision-center/ai/schema/decision-ai-output-schema";
import type { DecisionCandidate } from "@/lib/report/decision-center/types";

export type DecisionAiValidationResult =
  | { verdict: "publishable"; output: DecisionAiOutput }
  | { verdict: "needs_review" | "rejected"; failures: string[] };

/** C5: AI may only adjust wording — candidateId must exist. */
export function validateDecisionAiOutput(
  raw: unknown,
  candidates: DecisionCandidate[],
): DecisionAiValidationResult {
  const parsed = decisionAiOutputSchema.safeParse(raw);
  if (!parsed.success) {
    return { verdict: "rejected", failures: ["schema_invalid"] };
  }
  const allowed = new Set(candidates.map((c) => c.candidateId));
  const failures: string[] = [];
  for (const d of parsed.data.decisions) {
    if (!allowed.has(d.candidateId)) failures.push(`unsupported_candidate:${d.candidateId}`);
    if (/ordina.*\d+\s*pezzi/i.test(d.explanation)) failures.push("prescriptive_action");
    if (/ha causato|a causa di/i.test(d.explanation)) failures.push("causal_claim");
  }
  if (failures.some((f) => f.startsWith("unsupported_candidate"))) {
    return { verdict: "rejected", failures };
  }
  if (failures.length) return { verdict: "needs_review", failures };
  return { verdict: "publishable", output: parsed.data };
}

export function mergeDecisionAiWording(
  candidates: DecisionCandidate[],
  output: DecisionAiOutput,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of output.decisions) {
    map.set(item.candidateId, item.explanation);
  }
  return map;
}
