import type { AskReportConversationContext, AskReportRequest, EffectiveAskContext } from "@/lib/report/ask-report/types";
import type { ReportRequestedPeriod } from "@/lib/report/contracts/metadata-envelope";
import type { ReportCompareMode } from "@/lib/report/date-ranges";
import { resolveDatasetDateRanges } from "@/lib/report/datasets/period";
import { ymdFromDate } from "@/lib/report/date-ranges";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";

function normalizeEnvelopeCompare(mode: string): ReportRequestedPeriod["compareMode"] {
  if (mode === "none" || mode === "prev_period" || mode === "prev_year") return mode;
  return "prev_period";
}

function normalizePeriod(raw: Partial<ReportRequestedPeriod> | undefined): ReportRequestedPeriod {
  const preset = raw?.preset ?? "questo_mese";
  const compareMode = normalizeEnvelopeCompare(raw?.compareMode ?? "none");
  const draft: ReportRequestedPeriod = {
    preset,
    start: raw?.start ?? "",
    end: raw?.end ?? "",
    compareMode,
  };
  const { range } = resolveDatasetDateRanges({ period: draft });
  return {
    preset,
    start: raw?.start?.trim() || ymdFromDate(range.start),
    end: raw?.end?.trim() || ymdFromDate(range.end),
    compareMode,
  };
}

/** C7: client period/context is untrusted — parse, validate, merge */
export function resolveEffectiveContext(request: AskReportRequest): EffectiveAskContext {
  const hasConversation = Boolean(request.conversationId?.trim() && request.conversationContext?.period);
  const periodSource = hasConversation
    ? request.conversationContext!.period
    : (request.period ?? request.conversationContext?.period);
  const fromRequest = normalizePeriod(periodSource);
  const rawCompare = hasConversation
    ? (request.conversationContext?.compareMode ?? fromRequest.compareMode)
    : (request.compareMode ?? request.conversationContext?.compareMode ?? fromRequest.compareMode);
  const compareMode = rawCompare as ReportCompareMode;

  const period: ReportRequestedPeriod = {
    ...fromRequest,
    compareMode: normalizeEnvelopeCompare(compareMode),
  };

  let metricId =
    request.uiContext?.focusedMetricId ??
    request.conversationContext?.metricId;

  if (metricId && !getRegistryEntry(metricId)) {
    metricId = undefined;
  }

  const entity = request.uiContext?.focusedEntity ?? request.conversationContext?.entity;

  return { period, compareMode, metricId, entity };
}

export function toConversationContext(effective: EffectiveAskContext): AskReportConversationContext {
  return {
    period: effective.period,
    compareMode: effective.compareMode,
    metricId: effective.metricId,
    entity: effective.entity,
  };
}
