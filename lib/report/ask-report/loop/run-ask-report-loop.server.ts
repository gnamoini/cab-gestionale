import "server-only";

import { randomUUID } from "node:crypto";
import type { AskReportRequest, AskReportResponse, AskReportToolCall } from "@/lib/report/ask-report/types";
import type { ReportCompareMode as EnvelopeCompareMode } from "@/lib/report/contracts/metadata-envelope";
import type { ReportCompareMode } from "@/lib/report/date-ranges";
import { resolveEffectiveContext } from "@/lib/report/ask-report/context/resolve-effective-context.server";
import { classifyAskReportIntent, resolveMetricFromMessage, isAmbiguousMetricCountQuery, buildMetricClarificationQuestion } from "@/lib/report/ask-report/intent/classify-ask-report-intent";
import { resolveCompareModeFromMessage } from "@/lib/report/ask-report/intent/resolve-compare-from-message";
import {
  resolvePeriodHintFromMessage,
  calendarWeeksInYmdRange,
  calendarDaysInYmdRange,
  formatAskPeriodLabel,
} from "@/lib/report/ask-report/intent/resolve-ask-period-hint";
import { resolvePeriodAverageKind } from "@/lib/report/ask-report/intent/ask-period-average";
import { runAskReportTool } from "@/lib/report/ask-report/tools/run-ask-report-tool.server";
import type { AskReportToolName } from "@/lib/report/ask-report/tools/ask-report-tool-registry";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import {
  getCachedToolResult,
  setCachedToolResult,
  buildAskToolCacheKey,
} from "@/lib/report/ask-report/conversation/ask-report-conversation-cache";
import { buildAskReportResponse } from "@/lib/report/ask-report/answer/build-deterministic-answer";
import { resolveAskReportAnswer } from "@/lib/report/ask-report/ai/synthesize-ask-report-answer.server";
import { buildGreetingAnswer } from "@/lib/report/ask-report/intent/resolve-recidivita-intent";
import { validateAskReportAnswer } from "@/lib/report/ask-report/validation/validate-ask-report-answer";
import {
  ASK_REPORT_MAX_TOOL_ROUNDS,
  ASK_REPORT_MAX_TOOLS_PER_ROUND,
} from "@/lib/report/ask-report/budget/ask-report-context-budget";

function toEnvelopeCompareMode(mode: ReportCompareMode): EnvelopeCompareMode {
  if (mode === "none" || mode === "prev_period" || mode === "prev_year") return mode;
  return "prev_period";
}

function formatPeriodAverageAnswer(
  kind: "weekly" | "daily",
  env: ReportMetricEnvelope,
  period: { start: string; end: string },
  periodLabel: string,
): string {
  const total = typeof env.metric.value === "number" ? env.metric.value : Number(env.metric.value);
  if (!Number.isFinite(total)) {
    return kind === "weekly"
      ? "Dato non disponibile per calcolare la media settimanale nel periodo selezionato."
      : "Dato non disponibile per calcolare la media giornaliera nel periodo selezionato.";
  }
  const divisor = kind === "weekly" ? calendarWeeksInYmdRange(period.start, period.end) : calendarDaysInYmdRange(period.start, period.end);
  const avg = Math.round((total / divisor) * 10) / 10;
  const avgLabel = Number.isInteger(avg) ? String(avg) : avg.toFixed(1).replace(".", ",");
  const reg = getRegistryEntry(env.metricId);
  const metricLabel = reg?.label?.toLowerCase() ?? "chiusure";
  const unitLabel = kind === "weekly" ? "settimanale" : "giornaliera";
  const spanLabel =
    kind === "weekly"
      ? `${Number.isInteger(divisor) ? String(divisor) : divisor.toFixed(1).replace(".", ",")} settimane`
      : `${divisor} giorni`;
  return `Media ${unitLabel} ${metricLabel}: ${avgLabel} (${total} totali in ${periodLabel}, circa ${spanLabel}).`;
}

const TOOL_ACTIVITY_LABELS: Record<string, string> = {
  get_metric: "Analizzo metrica…",
  get_series: "Analizzo trend…",
  get_insights: "Controllo insight…",
  get_breakdown: "Analizzo breakdown…",
  get_operational_context: "Leggo contesto operativo…",
  get_decisions: "Consulto Decision Center…",
  get_drilldown: "Recupero record…",
  get_recidivita: "Analizzo recidività mezzi…",
};

function wantsTier3(message: string): boolean {
  return /\bmostra(mi)?\b|\bdettagli\b|\brecord\b|\blavorazioni\b/i.test(message);
}

async function executeToolCalls(
  calls: AskReportToolCall[],
  input: { effective: ReturnType<typeof resolveEffectiveContext>; userId: string; conversationId: string; allowTier3: boolean },
) {
  const results = [];
  const activity: string[] = [];
  for (const call of calls.slice(0, ASK_REPORT_MAX_TOOLS_PER_ROUND)) {
    const normalizedKey = buildAskToolCacheKey(call.args, {
      periodStart: input.effective.period.start,
      periodEnd: input.effective.period.end,
      compareMode: input.effective.compareMode,
    });
    const cached = getCachedToolResult(input.userId, input.conversationId, call.toolName, normalizedKey);
    if (cached) {
      results.push(cached);
      continue;
    }
    activity.push(TOOL_ACTIVITY_LABELS[call.toolName] ?? `Eseguo ${call.toolName}…`);
    const result = await runAskReportTool({
      toolName: call.toolName as AskReportToolName,
      rawArgs: call.args,
      effective: input.effective,
      userId: input.userId,
      allowTier3: input.allowTier3,
    });
    setCachedToolResult(input.userId, input.conversationId, call.toolName, normalizedKey, result);
    results.push(result);
  }
  return { results, activity };
}

export async function runAskReportLoop(input: {
  request: AskReportRequest;
  userId: string;
}): Promise<AskReportResponse> {
  const conversationId = input.request.conversationId ?? randomUUID();
  const effective = resolveEffectiveContext(input.request);
  const message = input.request.message.trim();
  const allowTier3 = wantsTier3(message);

  const periodHint = resolvePeriodHintFromMessage(
    message,
    effective.period.end ? Number(effective.period.end.slice(0, 4)) : new Date().getFullYear(),
    effective.period.end ? new Date(`${effective.period.end}T12:00:00`) : undefined,
  );
  if (periodHint) {
    effective.period = {
      ...effective.period,
      preset: "custom",
      start: periodHint.start,
      end: periodHint.end,
    };
  }

  effective.compareMode = resolveCompareModeFromMessage(message, effective.compareMode);
  effective.period.compareMode = toEnvelopeCompareMode(effective.compareMode);

  const classified = classifyAskReportIntent(message, effective);

  if (classified.intent === "greeting_query") {
    return buildAskReportResponse({
      conversationId,
      effective,
      answer: buildGreetingAnswer(),
      citations: [],
      toolResults: [],
      status: "completed",
      planMode: "deterministic",
      toolActivity: [],
    });
  }

  if (classified.needsClarification) {
    return buildAskReportResponse({
      conversationId,
      effective,
      answer: classified.clarificationQuestion ?? "Serve un chiarimento.",
      citations: [],
      toolResults: [],
      status: "needs_clarification",
      clarificationQuestion: classified.clarificationQuestion,
      planMode: classified.planMode,
      toolActivity: [],
    });
  }

  let toolCalls = classified.toolCalls ?? [];
  let planMode = classified.planMode;
  const allResults = [];
  const allActivity: string[] = [];
  let rounds = 0;

  while (rounds < ASK_REPORT_MAX_TOOL_ROUNDS) {
    if (!toolCalls.length) break;
    const { results, activity } = await executeToolCalls(toolCalls, {
      effective,
      userId: input.userId,
      conversationId,
      allowTier3,
    });
    allResults.push(...results);
    allActivity.push(...activity);
    rounds += 1;

    const needsMore =
      classified.intent === "explanation_query" &&
      rounds === 1 &&
      !allResults.some((r) => r.toolName === "get_operational_context");
    if (needsMore && allowTier3 === false) {
      toolCalls = [{ toolName: "get_operational_context", args: {} }];
      continue;
    }
    break;
  }

  if (classified.planMode === "llm" && !allResults.length) {
    if (isAmbiguousMetricCountQuery(message) || (!resolveMetricFromMessage(message, effective) && /\blavorazion/i.test(message))) {
      return buildAskReportResponse({
        conversationId,
        effective,
        answer: buildMetricClarificationQuestion(message),
        citations: [],
        toolResults: [],
        status: "needs_clarification",
        clarificationQuestion: buildMetricClarificationQuestion(message),
        planMode: "deterministic",
        toolActivity: [],
      });
    }
    const fallbackMetric =
      resolveMetricFromMessage(message, effective) ?? effective.metricId ?? "eco_fatturato";
    toolCalls = [
      { toolName: "get_metric", args: { metricId: fallbackMetric } },
      ...(fallbackMetric === "eco_fatturato" ? [{ toolName: "get_insights", args: {} }] : []),
    ];
    const { results, activity } = await executeToolCalls(toolCalls, {
      effective,
      userId: input.userId,
      conversationId,
      allowTier3,
    });
    allResults.push(...results);
    allActivity.push(...activity);
    planMode = "deterministic";
  }

  const metricResult = allResults.find((r) => r.toolName === "get_metric" && r.success);
  if (metricResult?.provenance.metricIds?.[0]) {
    effective.metricId = metricResult.provenance.metricIds[0];
  }

  const { answer: synthesizedAnswer, citations, usedAi } = await resolveAskReportAnswer({
    message,
    intent: classified.intent,
    planMode,
    toolResults: allResults,
    effective,
  });
  const validation = validateAskReportAnswer(synthesizedAnswer, allResults);
  if (usedAi) planMode = "llm";

  let status: AskReportResponse["status"] = "completed";
  let finalAnswer = synthesizedAnswer;
  const averageKind = resolvePeriodAverageKind(message);
  const periodLabel = periodHint?.label ?? formatAskPeriodLabel(effective.period);
  if (averageKind && metricResult?.success && metricResult.data) {
    finalAnswer = formatPeriodAverageAnswer(
      averageKind,
      metricResult.data as ReportMetricEnvelope,
      effective.period,
      periodLabel,
    );
  } else if (periodHint && validation.verdict !== "rejected") {
    finalAnswer = `${synthesizedAnswer}\n\n(Periodo dalla domanda: ${periodHint.label}.)`;
  }
  if (validation.verdict === "rejected" && !averageKind) {
    finalAnswer = "Non riesco a formulare una risposta affidabile in questo momento.";
    status = "failed";
  } else if (validation.verdict === "needs_retry") {
    finalAnswer = synthesizedAnswer;
  }

  return buildAskReportResponse({
    conversationId,
    effective,
    answer: finalAnswer,
    citations,
    toolResults: allResults,
    status,
    planMode,
    toolActivity: allActivity,
  });
}
