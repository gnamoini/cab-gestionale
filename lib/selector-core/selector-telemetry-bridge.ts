import { getTraceById, recordSelectorDecisionTrace } from "@/lib/selector-core/selector-decision-trace";
import type { SelectorDecisionTrace } from "@/lib/selector-core/selector-decision-trace";
import { emitSelectorOpenEvent } from "@/lib/selector-core/selector-telemetry";
import { bucketOptionCount } from "@/lib/selector-core/selector-thresholds";
import type { OptionCountBucket, SelectorSurfaceKind } from "@/lib/selector-core/types";

export type SelectorOpenEvent = {
  event: "selector_open_event";
  eventId: string;
  domain: string;
  surface: SelectorSurfaceKind;
  optionCountBucket: OptionCountBucket;
  searchUsed: boolean;
  isMobile: boolean;
  decisionLatencyMs: number;
  fallbackUsed: boolean;
  rolloutKey?: string;
  recordedAt: number;
};

export type SelectorOpenUiMeta = {
  isMobile: boolean;
  optionCount: number;
  domain: string;
  rolloutKey?: string;
};

export function registerSelectorDecision(eventId: string, trace: SelectorDecisionTrace): void {
  try {
    recordSelectorDecisionTrace({ ...trace, traceId: eventId });
  } catch {
    /* fire-and-forget */
  }
}

export function emitSelectorOpenFromUI(eventId: string, uiMeta: SelectorOpenUiMeta): void {
  try {
    const trace = getTraceById(eventId);
    const decision = trace?.outputDecision;
    const surface = decision?.surface ?? "dropdown";
    const searchUsed = decision?.flags.usesSearch ?? false;
    const decisionLatencyMs = decision?.decisionLatencyMs ?? trace?.decisionLatencyMs ?? 0;
    const fallbackUsed = decision?.fallbackUsed ?? trace?.fallbackUsed ?? false;

    emitSelectorOpenEvent({
      event: "selector_open_event",
      eventId,
      domain: uiMeta.domain,
      surface,
      optionCountBucket: bucketOptionCount(uiMeta.optionCount),
      searchUsed,
      isMobile: uiMeta.isMobile,
      decisionLatencyMs,
      fallbackUsed,
      rolloutKey: uiMeta.rolloutKey,
      recordedAt: Date.now(),
    });
  } catch {
    /* fire-and-forget */
  }
}
