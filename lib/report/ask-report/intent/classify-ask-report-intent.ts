import type { AskReportIntentResult, AskReportToolCall, EffectiveAskContext } from "@/lib/report/ask-report/types";
import {
  wantsDailyAverage,
  wantsWeeklyAverage,
} from "@/lib/report/ask-report/intent/ask-period-average";
import { messageMentionsItalianMonth } from "@/lib/report/ask-report/intent/resolve-ask-period-hint";
import { normalizeAskMessage } from "@/lib/report/ask-report/intent/normalize-ask-message";
import {
  buildLavorazioniClarification,
  isAmbiguousLavorazioniQuery,
  resolveAllMetricsFromMessage,
  resolveMetricFromMessage,
} from "@/lib/report/ask-report/intent/resolve-metric-from-message";
import {
  messageWantsComparison,
  resolveCompareModeFromMessage,
} from "@/lib/report/ask-report/intent/resolve-compare-from-message";
import {
  isCasualGreetingOrHelp,
  resolveRecidivitaRankBy,
  resolveRecidivitaSubject,
  resolveRecidivitaWindowDays,
  wantsRecidivitaQuery,
} from "@/lib/report/ask-report/intent/resolve-recidivita-intent";

function metricToolCalls(
  metricIds: string[],
  compareMode?: EffectiveAskContext["compareMode"],
): AskReportToolCall[] {
  return metricIds.map((metricId) => ({
    toolName: "get_metric",
    args: compareMode && compareMode !== "none" ? { metricId, compareMode } : { metricId },
  }));
}

function isFollowUp(message: string): boolean {
  const text = message.trim();
  return (
    /^(e\s+|anche\s+|rispetto\s+|in\s+percentuale\b|stesso\s+periodo\b|e\s+per\s+)/i.test(text) ||
    /\banno\s+scorso\b|\bmese\s+scorso\b|\bsettimana\s+scorsa\b/i.test(text)
  );
}

function wantsDrilldown(message: string): boolean {
  return /\bmostra(mi)?\b|\bdettagli\b|\blavorazioni\b.*\bspiegano\b|\brecord\b|\belenco\b/i.test(message);
}

function wantsMetricCount(message: string): boolean {
  return /\bquante?\b|\bquanto\b|\bcom['']?è\b|qual\s*[eé]|\bnumero\b|\bquanti\b/i.test(message);
}

export function isAmbiguousMetricCountQuery(message: string): boolean {
  if (!wantsMetricCount(message)) return false;
  if (isAmbiguousLavorazioniQuery(message)) return true;
  const emptyCtx: EffectiveAskContext = {
    period: { preset: "custom", start: "2026-01-01", end: "2026-01-31", compareMode: "none" },
    compareMode: "none",
  };
  return resolveAllMetricsFromMessage(message, emptyCtx).length === 0;
}

export function buildMetricClarificationQuestion(message: string): string {
  if (isAmbiguousLavorazioniQuery(message)) return buildLavorazioniClarification();
  return "Puoi specificare cosa vuoi analizzare? Es.: chiusure, fatturato, incassi, preventivi, ore lavorate, tempo di chiusura.";
}

function wantsBreakdown(message: string): boolean {
  return /\bclienti\b|\bquali\s+clienti\b|\bbreakdown\b|\bper\s+cliente\b|\bconcentrazion/i.test(message);
}

function wantsTrend(message: string): boolean {
  return (
    /\btrend\b|\bandamento\b|\bultime?\s+\d+\s+settimane\b|\b12\s+mesi\b|\bevoluzion|\bnel\s+tempo\b/i.test(
      message,
    )
  );
}

function wantsDecisions(message: string): boolean {
  return /\bdecisioni?\b|\bcriticit/i.test(message);
}

function wantsOperational(message: string): boolean {
  return /\bcosa\s+(sta|stava)\s+succedendo\b|\beventi\b|\bcontesto\s+operativ/i.test(message);
}

function wantsInsights(message: string): boolean {
  return /\binsight\b|\bsegnali\b|\bprincipali\s+criticit|\banomal/i.test(message);
}

function wantsExplanation(message: string): boolean {
  return /\bperch[eé]|perch[eé]\b|\bspiega\b|\bcosa\s+ha\s+causato\b|\bper\s+che\s+motivo\b/i.test(message);
}

function resolveCompareForMessage(message: string, ctx: EffectiveAskContext) {
  return resolveCompareModeFromMessage(message, ctx.compareMode);
}

function hasMultipleMetrics(message: string, ctx: EffectiveAskContext): boolean {
  return resolveAllMetricsFromMessage(message, ctx).length > 1;
}

/** C4: heuristic-first — LLM synthesis only when explanation/complex multi-metric */
export function classifyAskReportIntent(
  message: string,
  ctx: EffectiveAskContext,
): AskReportIntentResult {
  const text = normalizeAskMessage(message);
  const metricIds = resolveAllMetricsFromMessage(message, ctx);
  const metricId = metricIds[0];
  const compareMode = resolveCompareForMessage(message, ctx);

  if (isCasualGreetingOrHelp(message)) {
    return {
      intent: "greeting_query",
      confidence: 1,
      planMode: "deterministic",
      toolCalls: [],
    };
  }

  if (wantsRecidivitaQuery(message)) {
    return {
      intent: "recidivita_query",
      confidence: 0.92,
      planMode: "deterministic",
      toolCalls: [
        {
          toolName: "get_recidivita",
          args: {
            subject: resolveRecidivitaSubject(message),
            rankBy: resolveRecidivitaRankBy(message),
            windowDays: resolveRecidivitaWindowDays(message),
            limit: 5,
          },
        },
      ],
    };
  }

  if ((wantsWeeklyAverage(message) || wantsDailyAverage(message)) && metricId) {
    return {
      intent: "metric_query",
      confidence: 0.9,
      planMode: "deterministic",
      toolCalls: metricToolCalls([metricId], compareMode),
    };
  }

  if (isFollowUp(message) && metricId) {
    return {
      intent: "followup_query",
      confidence: 0.9,
      planMode: "deterministic",
      toolCalls: metricToolCalls([metricId], compareMode),
    };
  }

  if ((messageMentionsItalianMonth(message) || /\bmese\s+scorso\b|\btrimestre\b/i.test(text)) && metricIds.length) {
    return {
      intent: "metric_query",
      confidence: 0.88,
      planMode: "deterministic",
      toolCalls: metricToolCalls(metricIds, compareMode),
    };
  }

  if (wantsDrilldown(message) && metricId) {
    return {
      intent: "drilldown_query",
      confidence: 0.85,
      planMode: "deterministic",
      toolCalls: [{ toolName: "get_drilldown", args: { metricId } }],
    };
  }

  if (wantsDecisions(message)) {
    const status = /\bmonitor/i.test(text) ? "monitoring" : /\bapert|nuov|critich/i.test(text) ? "new" : undefined;
    return {
      intent: "decision_query",
      confidence: 0.88,
      planMode: "deterministic",
      toolCalls: [{ toolName: "get_decisions", args: { status } }],
    };
  }

  if (wantsOperational(message)) {
    return {
      intent: "operational_context_query",
      confidence: 0.85,
      planMode: "deterministic",
      toolCalls: [{ toolName: "get_operational_context", args: {} }],
    };
  }

  if (wantsBreakdown(message)) {
    return {
      intent: "breakdown_query",
      confidence: 0.86,
      planMode: "deterministic",
      toolCalls: [
        { toolName: "get_breakdown", args: { metricId: metricId ?? "eco_fatturato", dimension: "cliente" } },
      ],
    };
  }

  if (wantsInsights(message)) {
    return {
      intent: "insight_query",
      confidence: 0.86,
      planMode: "deterministic",
      toolCalls: [{ toolName: "get_insights", args: {} }],
    };
  }

  if (wantsExplanation(message)) {
    if (metricId) {
      return {
        intent: "explanation_query",
        confidence: 0.8,
        planMode: "llm",
        toolCalls: [
          ...metricToolCalls(metricIds.length ? metricIds : [metricId], compareMode),
          { toolName: "get_insights", args: {} },
        ],
      };
    }
    return {
      intent: "explanation_query",
      confidence: 0.45,
      planMode: "llm",
      toolCalls: [{ toolName: "get_insights", args: {} }],
    };
  }

  if (wantsTrend(message) && metricId) {
    const granularity = /\b12\s+mesi\b|\bmensil/i.test(text) ? "month" : "week";
    return {
      intent: "trend_query",
      confidence: 0.88,
      planMode: "deterministic",
      toolCalls: [{ toolName: "get_series", args: { metricId, granularity } }],
    };
  }

  if (messageWantsComparison(message) && metricIds.length) {
    return {
      intent: "comparison_query",
      confidence: 0.9,
      planMode: metricIds.length > 1 ? "llm" : "deterministic",
      toolCalls: metricToolCalls(metricIds, compareMode),
    };
  }

  if ((wantsMetricCount(message) || /\bquanto\b|\bcom['']?è\b|\bvalore\b/i.test(text)) && metricIds.length) {
    return {
      intent: "metric_query",
      confidence: 0.92,
      planMode: metricIds.length > 1 ? "llm" : "deterministic",
      toolCalls: metricToolCalls(metricIds, compareMode),
    };
  }

  if (hasMultipleMetrics(message, ctx)) {
    return {
      intent: "metric_query",
      confidence: 0.85,
      planMode: "llm",
      toolCalls: metricToolCalls(metricIds, compareMode),
    };
  }

  if (/\bcome\s+sta\s+andando\b|\bsintesi\b|\briepilogo\b|\bpanoramica\b/i.test(text)) {
    return {
      intent: "summary_query",
      confidence: 0.75,
      planMode: "llm",
      toolCalls: [
        { toolName: "get_metric", args: { metricId: "eco_fatturato", compareMode } },
        { toolName: "get_metric", args: { metricId: "lav-chiusi", compareMode } },
        { toolName: "get_insights", args: {} },
      ],
    };
  }

  if (isAmbiguousMetricCountQuery(message)) {
    return {
      intent: "metric_query",
      confidence: 0.4,
      planMode: "deterministic",
      needsClarification: true,
      clarificationQuestion: buildMetricClarificationQuestion(message),
    };
  }

  if (!metricId && messageWantsComparison(message)) {
    return {
      intent: "comparison_query",
      confidence: 0.35,
      planMode: "deterministic",
      needsClarification: true,
      clarificationQuestion:
        "Cosa vuoi confrontare con il periodo precedente? Es.: fatturato, chiusure, incassi, tempo di chiusura.",
    };
  }

  return {
    intent: "summary_query",
    confidence: 0.3,
    planMode: "deterministic",
    needsClarification: true,
    clarificationQuestion:
      "Non ho capito bene la richiesta. Puoi indicare cosa vuoi analizzare (es. chiusure, fatturato, incassi, preventivi) e il periodo?",
  };
}

export { resolveMetricFromMessage, resolveAllMetricsFromMessage };
