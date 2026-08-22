import { z } from "zod";
import type { ReportDimensionId } from "@/lib/report/metrics/report-metric-types";

export type AskReportToolTier = 1 | 2 | 3;

export type AskReportToolName =
  | "get_metric"
  | "get_series"
  | "get_insights"
  | "get_breakdown"
  | "get_operational_context"
  | "get_decisions"
  | "get_drilldown"
  | "get_recidivita";

const FORBIDDEN_ARG_KEYS = new Set(["table", "column", "sql", "query", "metricFormula", "formula"]);

export const getMetricArgsSchema = z.object({
  metricId: z.string().min(1),
  compareMode: z.string().optional(),
});

export const getSeriesArgsSchema = z.object({
  metricId: z.string().min(1),
  granularity: z.enum(["day", "week", "month"]).default("week"),
  compareMode: z.string().optional(),
});

export const getBreakdownArgsSchema = z.object({
  metricId: z.string().min(1),
  dimension: z.enum(["cliente"] satisfies [ReportDimensionId]),
});

export const getInsightsArgsSchema = z.object({});

export const getOperationalContextArgsSchema = z.object({});

export const getDecisionsArgsSchema = z.object({
  status: z.enum(["new", "acknowledged", "monitoring", "resolved", "dismissed"]).optional(),
  category: z.string().optional(),
});

export const getDrilldownArgsSchema = z.object({
  metricId: z.string().min(1),
  dimension: z.string().optional(),
  dimensionValue: z.string().optional(),
});

export const getRecidivitaArgsSchema = z.object({
  subject: z.enum(["operatore", "mezzo", "fleet"]).default("operatore"),
  rankBy: z.enum(["ritorni", "mezzi_con_ritorno", "risk_index"]).default("ritorni"),
  windowDays: z.union([z.literal(30), z.literal(90), z.literal(365)]).default(30),
  limit: z.number().int().min(1).max(10).optional(),
});

export type AskReportToolDefinition = {
  toolName: AskReportToolName;
  tier: AskReportToolTier;
  description: string;
  inputSchema: z.ZodTypeAny;
  allowedMetricIds?: readonly string[];
  allowedDimensions?: readonly string[];
  normalizeArgs: (raw: Record<string, unknown>) => { ok: true; args: Record<string, unknown> } | { ok: false; error: string };
};

function rejectUnknownKeys(raw: Record<string, unknown>): string | null {
  for (const key of Object.keys(raw)) {
    if (FORBIDDEN_ARG_KEYS.has(key)) return `forbidden_arg:${key}`;
  }
  return null;
}

function makeNormalizer<T extends z.ZodTypeAny>(schema: T): AskReportToolDefinition["normalizeArgs"] {
  return (raw) => {
    const forbidden = rejectUnknownKeys(raw);
    if (forbidden) return { ok: false, error: forbidden };
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "schema_invalid" };
    return { ok: true, args: parsed.data as Record<string, unknown> };
  };
}

export const ASK_REPORT_TOOL_REGISTRY: AskReportToolDefinition[] = [
  {
    toolName: "get_metric",
    tier: 1,
    description: "Certified metric envelope for a period",
    inputSchema: getMetricArgsSchema,
    normalizeArgs: makeNormalizer(getMetricArgsSchema),
  },
  {
    toolName: "get_series",
    tier: 1,
    description: "Time series for a metric",
    inputSchema: getSeriesArgsSchema,
    normalizeArgs: makeNormalizer(getSeriesArgsSchema),
  },
  {
    toolName: "get_insights",
    tier: 1,
    description: "Deterministic insights for period",
    inputSchema: getInsightsArgsSchema,
    normalizeArgs: makeNormalizer(getInsightsArgsSchema),
  },
  {
    toolName: "get_breakdown",
    tier: 2,
    description: "Dimension breakdown (cliente)",
    inputSchema: getBreakdownArgsSchema,
    allowedDimensions: ["cliente"],
    normalizeArgs: makeNormalizer(getBreakdownArgsSchema),
  },
  {
    toolName: "get_operational_context",
    tier: 2,
    description: "Operational summary events",
    inputSchema: getOperationalContextArgsSchema,
    normalizeArgs: makeNormalizer(getOperationalContextArgsSchema),
  },
  {
    toolName: "get_decisions",
    tier: 2,
    description: "Decision Center points",
    inputSchema: getDecisionsArgsSchema,
    normalizeArgs: makeNormalizer(getDecisionsArgsSchema),
  },
  {
    toolName: "get_drilldown",
    tier: 3,
    description: "Record-level drill-down (deep analysis)",
    inputSchema: getDrilldownArgsSchema,
    normalizeArgs: makeNormalizer(getDrilldownArgsSchema),
  },
  {
    toolName: "get_recidivita",
    tier: 2,
    description: "Recidività mezzi e ranking operatori nel periodo",
    inputSchema: getRecidivitaArgsSchema,
    normalizeArgs: makeNormalizer(getRecidivitaArgsSchema),
  },
];

export function getAskReportTool(name: string): AskReportToolDefinition | undefined {
  return ASK_REPORT_TOOL_REGISTRY.find((t) => t.toolName === name);
}

export function isToolAllowedAtTier(toolName: AskReportToolName, maxTier: AskReportToolTier): boolean {
  const tool = getAskReportTool(toolName);
  return tool != null && tool.tier <= maxTier;
}
