import { selectorEngineConfig } from "@/lib/selector-core/selector-engine-config";
import type { FallbackSource } from "@/lib/selector-core/selector-fallback-trace";
import type { SelectorRuntimeContext } from "@/lib/selector-core/selector-runtime-context-snapshot";
import type { SelectorContext, SelectorSurfaceDecision } from "@/lib/selector-core/types";

export type { FallbackSource } from "@/lib/selector-core/selector-fallback-trace";
export type {
  FallbackTrace,
  FallbackRejectedSource,
} from "@/lib/selector-core/selector-fallback-trace";

export type SelectorDecisionTrace = {
  traceId: string;
  inputContext: SelectorContext;
  outputDecision: SelectorSurfaceDecision;
  reasoning: string[];
  matchedRules: string[];
  fallbackUsed: boolean;
  decisionLatencyMs: number;
  recordedAt: number;
  /** @advisory v5.3.3 — snapshot selection explainability */
  selectionPath?: string[];
  fallbackChainReason?: string[];
  registrySourceUsed?: FallbackSource;
  driftDetectedAtSelection?: boolean;
  snapshotVersion?: string;
  pointerEpoch?: number;
  /** @advisory v5.3.4 — immutable runtime context for replay */
  runtimeContext?: SelectorRuntimeContext;
};

const TRACE_BUFFER_MAX = 200;
const traceBuffer: SelectorDecisionTrace[] = [];
const traceById = new Map<string, SelectorDecisionTrace>();
const TRACE_MAP_MAX = 500;

let sampleCounter = 0;

export function shouldRecordTrace(): boolean {
  const { traceEnabled, traceSampleRate } = selectorEngineConfig.observability;
  if (traceEnabled) return true;
  if (traceSampleRate <= 0) return false;
  sampleCounter += 1;
  return sampleCounter % Math.max(1, Math.floor(1 / traceSampleRate)) === 0;
}

export function recordSelectorDecisionTrace(trace: SelectorDecisionTrace): void {
  try {
    traceById.set(trace.traceId, trace);
    if (traceById.size > TRACE_MAP_MAX) {
      const oldest = traceById.keys().next().value;
      if (oldest) traceById.delete(oldest);
    }

    if (!shouldRecordTrace()) return;

    if (traceBuffer.length >= TRACE_BUFFER_MAX) {
      traceBuffer.shift();
    }
    traceBuffer.push(trace);

    if (
      typeof process !== "undefined" &&
      process.env.NODE_ENV !== "production" &&
      selectorEngineConfig.observability.traceEnabled
    ) {
      console.debug("[selector-decision-trace]", trace);
    }
  } catch {
    /* fire-and-forget */
  }
}

export function getTraceById(traceId: string): SelectorDecisionTrace | undefined {
  return traceById.get(traceId);
}

export function getSelectorDecisionTraceBuffer(): readonly SelectorDecisionTrace[] {
  return traceBuffer;
}

export function clearSelectorDecisionTraceBuffer(): void {
  traceBuffer.length = 0;
  traceById.clear();
  sampleCounter = 0;
}

/** Test-only */
export function __resetSelectorDecisionTraceForTests(): void {
  clearSelectorDecisionTraceBuffer();
}
