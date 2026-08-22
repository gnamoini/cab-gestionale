import { z } from "zod";
import {
  BUSINESS_REPORT_ENGINE_VERSION,
  BUSINESS_REPORT_PROMPT_VERSION,
  BUSINESS_REPORT_SCHEMA_VERSION,
} from "@/lib/report/business-report/versions";

const insightItemSchema = z.object({
  id: z.string(),
  ruleKey: z.string(),
  title: z.string(),
  explanation: z.string(),
  severity: z.enum(["positive", "negative", "attention", "neutral"]),
  metricIds: z.array(z.string()),
  insightRuleKeys: z.array(z.string()),
  aiExplanation: z.string().optional(),
});

const eventRefSchema = z.object({
  id: z.string(),
  headline: z.string(),
  source: z.enum(["automatic", "diary"]),
  metricIds: z.array(z.string()).optional(),
  insightRuleKeys: z.array(z.string()).optional(),
});

const correlationRefSchema = z.object({
  id: z.string(),
  label: z.string(),
  association: z.enum(["correlato", "temporalmente_associato", "possibile_fattore", "evento_coincidente"]),
  metricIds: z.array(z.string()),
  insightRuleKeys: z.array(z.string()).optional(),
  eventIds: z.array(z.string()).optional(),
});

const decisionSchema = z.object({
  title: z.string().min(1).max(200),
  rationale: z.string().min(1).max(800),
  supportingMetricIds: z.array(z.string()).min(1),
  insightRuleKeys: z.array(z.string()).optional(),
  aiRationale: z.string().optional(),
});

const domainMetricChangeSchema = z.object({
  metricId: z.string(),
  label: z.string(),
  value: z.string(),
  deltaPercent: z.number().nullable(),
  deltaLabel: z.string().nullable(),
});

const domainInsightWatchSchema = z.object({
  ruleKey: z.string(),
  title: z.string(),
  explanation: z.string(),
  severity: z.enum(["positive", "negative", "attention", "neutral"]),
});

const domainBriefSchema = z.object({
  domainId: z.string(),
  title: z.string(),
  improved: z.array(domainMetricChangeSchema),
  worsened: z.array(domainMetricChangeSchema),
  snapshots: z.array(domainMetricChangeSchema),
  watch: z.array(domainInsightWatchSchema),
  narrative: z.string().optional(),
});

const trustSummarySchema = z.object({
  exact: z.number(),
  estimated: z.number(),
  partial: z.number(),
  notAvailable: z.number(),
  lowestTrust: z.enum(["verified", "estimated", "partial", "not_available"]),
});

const provenanceSchema = z.object({
  engineVersion: z.string(),
  reportSchemaVersion: z.string(),
  promptVersion: z.string(),
  generatedAt: z.string(),
  period: z.object({ from: z.string(), to: z.string() }),
  compareMode: z.string(),
  metricIds: z.array(z.string()),
  formulaIds: z.array(z.string()),
  insightRuleKeys: z.array(z.string()),
  insightCount: z.number(),
  eventCount: z.number(),
  correlationCount: z.number(),
});

/** Persisted BusinessReport — structured, not free-form LLM dump. */
export const businessReportSchema = z.object({
  contractVersion: z.literal(BUSINESS_REPORT_SCHEMA_VERSION),
  id: z.string().uuid(),
  logicalReportKey: z.string().min(1),
  generationVersion: z.number().int().positive(),
  reportType: z.enum(["weekly", "monthly", "custom"]),
  period: z.object({ from: z.string(), to: z.string() }),
  compare: z
    .object({
      mode: z.string(),
      from: z.string().nullable(),
      to: z.string().nullable(),
    })
    .optional(),
  generatedAt: z.string(),
  status: z.enum(["generating", "completed", "failed"]),
  aiStatus: z.enum(["completed", "unavailable"]),
  executiveSummary: z.string(),
  domainBriefs: z.array(domainBriefSchema).optional(),
  kpis: z.array(z.unknown()),
  trends: z.array(z.unknown()),
  highlights: z.array(insightItemSchema),
  concerns: z.array(insightItemSchema),
  anomalies: z.array(insightItemSchema),
  events: z.array(eventRefSchema),
  operationalContext: z
    .object({
      events: z.array(eventRefSchema),
      correlations: z.array(correlationRefSchema),
    })
    .optional(),
  decisions: z.array(decisionSchema),
  trustSummary: trustSummarySchema,
  provenance: provenanceSchema,
  quality: z
    .object({
      verdict: z.enum(["publishable", "needs_retry", "failed"]),
      dataCompleteness: z.number(),
      metricCoverage: z.number(),
      claimSupport: z.number(),
      trustCompliance: z.number(),
      failures: z.array(z.string()).optional(),
    })
    .optional(),
  error: z.string().optional(),
});

export type BusinessReportSchema = z.infer<typeof businessReportSchema>;

export const BUSINESS_REPORT_DEFAULT_PROVENANCE = {
  engineVersion: BUSINESS_REPORT_ENGINE_VERSION,
  reportSchemaVersion: BUSINESS_REPORT_SCHEMA_VERSION,
  promptVersion: BUSINESS_REPORT_PROMPT_VERSION,
} as const;
