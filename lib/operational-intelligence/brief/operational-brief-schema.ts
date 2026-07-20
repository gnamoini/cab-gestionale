import { z } from "zod";

const confidenceSchema = z.enum(["high", "medium", "low"]);

const evidenceRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("metric"), metricId: z.string(), value: z.union([z.number(), z.string()]) }),
  z.object({ kind: z.literal("diary"), entryId: z.string(), excerpt: z.string() }),
  z.object({ kind: z.literal("insight"), ruleKey: z.string(), payload: z.record(z.string(), z.unknown()) }),
  z.object({
    kind: z.literal("delta"),
    metricId: z.string(),
    current: z.number(),
    previous: z.number(),
    deltaPct: z.number(),
  }),
]);

const evidencedStatementSchema = z.object({
  statement: z.string().min(1).max(300),
  confidence: confidenceSchema,
  evidence: z.array(evidenceRefSchema).max(5).optional().default([]),
});

const domainTrendSchema = z.enum(["up", "down", "flat"]);

const domainScoreSchema = z.object({
  score: z.number(),
  trend: domainTrendSchema,
});

export const operationalBriefLlmContentSchema = z.object({
  executiveSummary: z.object({
    status: z.enum(["good", "attention", "critical"]),
    headline: z.string().min(1).max(120),
    explanation: z.string().min(1).max(600),
    confidence: confidenceSchema,
  }),
  todayPriorities: z.array(evidencedStatementSchema).max(5),
  topProblems: z.array(evidencedStatementSchema).max(3),
  wins: z.array(evidencedStatementSchema).max(3),
  recommendedActions: z
    .array(
      z.object({
        priority: z.enum(["alta", "media", "bassa"]),
        problem: z.string().min(1).max(200),
        impact: z.string().min(1).max(200),
        action: z.string().min(1).max(300),
        confidence: confidenceSchema,
      }),
    )
    .max(6),
  domainAnalysis: z.object({
    production: z.object({ summary: z.string().max(400), trend: domainTrendSchema }),
    fleet: z.object({ summary: z.string().max(400), trend: domainTrendSchema }),
    warehouse: z.object({ summary: z.string().max(400), trend: domainTrendSchema }),
    staff: z.object({ summary: z.string().max(400), trend: domainTrendSchema }),
    costs: z.object({ summary: z.string().max(400), trend: domainTrendSchema }),
  }),
  disclaimer: z.string().min(1).max(500).optional(),
});

export type OperationalBriefLlmContent = z.infer<typeof operationalBriefLlmContentSchema>;

/** Client-side loose validation — full shape enforced server-side after merge. */
export const operationalBriefOutputSchema = z.object({
  contractVersion: z.literal("1"),
  period: z.object({
    id: z.string(),
    type: z.enum(["weekly", "monthly", "custom"]),
    startDate: z.string(),
    endDate: z.string(),
    previousPeriodId: z.string().nullable(),
    label: z.string(),
    status: z.enum(["open", "closed", "brief_generated"]),
    generatedAt: z.string().nullable(),
  }),
  briefScore: z.object({
    overall: z.number(),
    status: z.enum(["green", "amber", "red"]),
    domains: z.object({
      production: domainScoreSchema,
      reliability: domainScoreSchema,
      warehouse: domainScoreSchema,
      staff: domainScoreSchema,
      costs: domainScoreSchema,
    }),
    reasons: z.array(z.string()),
  }),
  executiveSummary: z.object({
    status: z.enum(["good", "attention", "critical"]),
    headline: z.string(),
    explanation: z.string(),
    confidence: confidenceSchema,
    evidence: z.array(evidenceRefSchema).optional().default([]),
  }),
  todayPriorities: z.array(evidencedStatementSchema),
  topProblems: z.array(evidencedStatementSchema),
  wins: z.array(evidencedStatementSchema),
  events: z.array(z.unknown()),
  recommendedActions: z.array(z.unknown()),
  domainAnalysis: z.record(z.string(), z.unknown()),
  qualitativeContextUsed: z.array(z.unknown()),
  disclaimer: z.string(),
  generatedAt: z.string(),
  modelMetadata: z.object({
    model: z.string(),
    promptVersion: z.string(),
    inputHash: z.string(),
  }),
});
