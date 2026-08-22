import { z } from "zod";

/** LLM output — explanations only; buckets pre-classified in prompt context. */
export const businessReportAiOutputSchema = z.object({
  executiveSummary: z.string().min(1).max(1200),
  highlightExplanations: z
    .array(
      z.object({
        ruleKey: z.string(),
        title: z.string().min(1).max(120),
        explanation: z.string().min(1).max(600),
        metricIds: z.array(z.string()).min(1),
      }),
    )
    .max(8),
  concernExplanations: z
    .array(
      z.object({
        ruleKey: z.string(),
        title: z.string().min(1).max(120),
        explanation: z.string().min(1).max(600),
        metricIds: z.array(z.string()).min(1),
      }),
    )
    .max(8),
  anomalyExplanations: z
    .array(
      z.object({
        ruleKey: z.string(),
        title: z.string().min(1).max(120),
        explanation: z.string().min(1).max(600),
        metricIds: z.array(z.string()).min(1),
      }),
    )
    .max(6),
  decisions: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        rationale: z.string().min(1).max(800),
        supportingMetricIds: z.array(z.string()).min(1),
        insightRuleKeys: z.array(z.string()).optional(),
      }),
    )
    .max(5),
  domainNarratives: z
    .array(
      z.object({
        domainId: z.string().min(1),
        summary: z.string().min(1).max(900),
      }),
    )
    .max(7)
    .optional(),
});

export type BusinessReportAiOutput = z.infer<typeof businessReportAiOutputSchema>;
