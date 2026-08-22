import type {
  AskReportCitation,
  AskReportFollowUp,
  AskReportResponse,
  AskReportToolResult,
  EffectiveAskContext,
} from "@/lib/report/ask-report/types";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import { formatMetricDeltaForAnswer, formatMetricValueForAnswer } from "@/lib/report/ask-report/tools/run-ask-report-tool.server";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import type { InsightDto } from "@/lib/report/insights/types";
import type { ReportDecisionPoint } from "@/lib/report/decision-center/types";
import { ASK_REPORT_SCHEMA_VERSION } from "@/lib/report/ask-report/versions";
import { toConversationContext } from "@/lib/report/ask-report/context/resolve-effective-context.server";
import { formatAskRecidivitaAnswer } from "@/lib/report/ask-report/answer/format-ask-recidivita-answer";
import type { AskRecidivitaToolData } from "@/lib/report/ask-report/recidivita/load-ask-recidivita.server";

const TRUST_LABEL: Record<string, string> = {
  verified: "",
  estimated: " (stimato)",
  partial: " (dato parziale)",
  not_available: "",
};

export function buildDeterministicAnswer(
  toolResults: AskReportToolResult[],
  effective: EffectiveAskContext,
): { answer: string; citations: AskReportCitation[]; followUps: AskReportFollowUp[] } {
  const citations = toolResults.flatMap((r) => r.citations);
  const followUps: AskReportFollowUp[] = [];
  const lines: string[] = [];

  for (const result of toolResults) {
    if (!result.success || !result.data) continue;

    if (result.toolName === "get_metric" && !Array.isArray(result.data)) {
      const env = result.data as ReportMetricEnvelope;
      const reg = getRegistryEntry(env.metricId);
      const label = reg?.label ?? env.metricId;
      const value = formatMetricValueForAnswer(env);
      const delta = formatMetricDeltaForAnswer(env);
      const trust = TRUST_LABEL[env.trust] ?? "";
      lines.push(`${label}: ${value}${trust}${delta ? ` (${delta} vs confronto)` : ""}.`);
      if (env.metricId) {
        followUps.push({
          label: "Confronta periodo",
          message: `Confronta ${label.toLowerCase()} con il mese scorso`,
        });
      }
    }

    if (result.toolName === "get_insights" && Array.isArray(result.data)) {
      const insights = result.data as InsightDto[];
      if (insights.length) {
        lines.push("Segnali principali:");
        for (const i of insights.slice(0, 3)) {
          lines.push(`• ${i.message}`);
        }
      }
    }

    if (result.toolName === "get_decisions" && Array.isArray(result.data)) {
      const decisions = result.data as ReportDecisionPoint[];
      if (!decisions.length) {
        lines.push("Nessuna decisione aperta nel periodo selezionato.");
      } else {
        lines.push(`Decisioni (${decisions.length}):`);
        for (const d of decisions.slice(0, 5)) {
          lines.push(`• [${d.priority}] ${d.title} — ${d.status}`);
        }
      }
    }

    if (result.toolName === "get_operational_context" && result.data && !Array.isArray(result.data)) {
      const events = (result.data as { summaryEvents: { title: string }[] }).summaryEvents;
      if (events.length) {
        lines.push("Contesto operativo:");
        for (const e of events.slice(0, 3)) {
          lines.push(`• ${e.title}`);
        }
      }
    }

    if (result.toolName === "get_breakdown" && result.data && !Array.isArray(result.data)) {
      const breakdown = result.data as import("@/lib/report/analytics-engine/types").ReportDimensionBreakdown;
      if (breakdown.rows?.length) {
        lines.push(`Breakdown ${breakdown.dimension}:`);
        for (const row of breakdown.rows.slice(0, 5)) {
          lines.push(`• ${row.label}: ${row.value}`);
        }
      }
    }

    if (result.toolName === "get_series" && result.data && !Array.isArray(result.data)) {
      const { series, metricId } = result.data as {
        series: import("@/lib/report/analytics-engine/types").ReportMetricSeries[];
        metricId: string;
      };
      const reg = getRegistryEntry(metricId);
      const label = reg?.label ?? metricId;
      const points = series.flatMap((s) => s.points).filter((p) => p.value != null);
      if (points.length) {
        const tail = points.slice(-4);
        const formatted = tail
          .map((p) => {
            const v = formatMetricValueForAnswer({
              metricId,
              formulaId: "",
              trust: p.trust,
              metric: { value: p.value },
            } as ReportMetricEnvelope);
            return `${p.periodStart.slice(5)}: ${v}`;
          })
          .join(", ");
        const first = points[0]!.value ?? 0;
        const last = points[points.length - 1]!.value ?? 0;
        const dir = last > first ? "in crescita" : last < first ? "in calo" : "stabile";
        lines.push(`Andamento ${label} (${dir}): ${formatted}.`);
      }
    }

    if (result.toolName === "get_drilldown" && result.data && !Array.isArray(result.data)) {
      const { rows } = result.data as { rows: { label: string }[] };
      lines.push(`Record trovati: ${rows.length}. Usa le citazioni per approfondire.`);
    }

    if (result.toolName === "get_recidivita" && result.data && !Array.isArray(result.data)) {
      lines.push(formatAskRecidivitaAnswer(result.data as AskRecidivitaToolData));
    }
  }

  if (!lines.length) {
    return {
      answer: "Dato non disponibile per la domanda nel periodo selezionato.",
      citations,
      followUps,
    };
  }

  const metricLines = lines.filter((l) => !l.startsWith("Segnali") && !l.startsWith("Decisioni") && !l.startsWith("Contesto") && !l.startsWith("Breakdown") && !l.startsWith("Andamento") && !l.startsWith("Record"));
  const metricOnly =
    toolResults.length === 1 &&
    toolResults[0]?.toolName === "get_metric" &&
    toolResults[0]?.success;

  const recidivitaOnly =
    toolResults.length === 1 &&
    toolResults[0]?.toolName === "get_recidivita" &&
    toolResults[0]?.success;

  if (recidivitaOnly) {
    return {
      answer: lines[0] ?? lines.join("\n"),
      citations,
      followUps: [
        {
          label: "Top mezzi critici",
          message: "Quali sono i mezzi con più recidività nel periodo?",
        },
      ],
    };
  }

  if (metricOnly) {
    return {
      answer: lines[0] ?? lines.join(" "),
      citations,
      followUps,
    };
  }

  const multiMetric =
    toolResults.filter((r) => r.toolName === "get_metric" && r.success).length > 1;

  if (multiMetric && metricLines.length) {
    return {
      answer: metricLines.join("\n"),
      citations,
      followUps,
    };
  }

  const summary = lines.slice(0, 3).join(" ");
  return {
    answer: `${summary}\n\nDATI CHIAVE\n${lines.map((l) => (l.startsWith("•") ? l : `• ${l}`)).join("\n")}`,
    citations,
    followUps,
  };
}

export function buildAskReportResponse(input: {
  conversationId: string;
  effective: EffectiveAskContext;
  answer: string;
  citations: AskReportCitation[];
  toolResults: AskReportToolResult[];
  status: AskReportResponse["status"];
  clarificationQuestion?: string;
  planMode: "deterministic" | "llm";
  toolActivity: string[];
}): AskReportResponse {
  const { toolResults } = input;
  const metrics = toolResults
    .filter((r) => r.toolName === "get_metric" && r.success && r.data && !Array.isArray(r.data))
    .map((r) => r.data as ReportMetricEnvelope);

  const insights = toolResults
    .filter((r) => r.toolName === "get_insights" && Array.isArray(r.data))
    .flatMap((r) => r.data as InsightDto[]);

  const decisions = toolResults
    .filter((r) => r.toolName === "get_decisions" && Array.isArray(r.data))
    .flatMap((r) => r.data as ReportDecisionPoint[]);

  const drillDownContexts = toolResults
    .filter((r) => r.toolName === "get_drilldown" && r.data && !Array.isArray(r.data))
    .map((r) => (r.data as { context: import("@/lib/report/drilldown/types").ReportDrillDownContext }).context);

  const { followUps } = buildDeterministicAnswer(input.toolResults, input.effective);

  return {
    contractVersion: ASK_REPORT_SCHEMA_VERSION,
    conversationId: input.conversationId,
    conversationContext: toConversationContext(input.effective),
    answer: input.answer,
    citations: input.citations,
    metrics: metrics.length ? metrics : undefined,
    insights: insights.length ? insights : undefined,
    decisions: decisions.length ? decisions : undefined,
    drillDownContexts: drillDownContexts.length ? drillDownContexts : undefined,
    followUps: followUps.length ? followUps : undefined,
    status: input.status,
    clarificationQuestion: input.clarificationQuestion,
    toolActivity: input.toolActivity,
    planMode: input.planMode,
  };
}
