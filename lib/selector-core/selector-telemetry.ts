/**
 * Telemetria selector strutturata (v3.1) — fire-and-forget sink.
 */
import { selectorEngineConfig } from "@/lib/selector-core/selector-engine-config";
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

/** @deprecated use SelectorOpenEvent */
export type SelectorTelemetryEvent = {
  selector_open_time_ms: number;
  selector_surface_used: SelectorSurfaceKind;
  search_used: boolean;
  option_count_bucket: OptionCountBucket;
  domain: string;
  rolloutKey?: string;
};

const TELEMETRY_BUFFER_MAX = 200;
const openEventBuffer: SelectorOpenEvent[] = [];
/** @deprecated legacy buffer shape */
const legacyTelemetryBuffer: SelectorTelemetryEvent[] = [];

export { bucketOptionCount };

function scheduleTelemetry(fn: () => void): void {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(fn);
    return;
  }
  setTimeout(fn, 0);
}

export function getSelectorOpenEventBuffer(): readonly SelectorOpenEvent[] {
  return openEventBuffer;
}

/** Dev/CLI snapshot export — not used by runtime decision engine. */
export function exportSelectorOpenEventSnapshot(): SelectorOpenEvent[] {
  return [...openEventBuffer];
}

/** @deprecated use getSelectorOpenEventBuffer */
export function getSelectorTelemetryBuffer(): readonly SelectorTelemetryEvent[] {
  return legacyTelemetryBuffer;
}

export function clearSelectorTelemetryBuffer(): void {
  openEventBuffer.length = 0;
  legacyTelemetryBuffer.length = 0;
}

function toLegacyEvent(event: SelectorOpenEvent): SelectorTelemetryEvent {
  return {
    selector_open_time_ms: event.decisionLatencyMs,
    selector_surface_used: event.surface,
    search_used: event.searchUsed,
    option_count_bucket: event.optionCountBucket,
    domain: event.domain,
    rolloutKey: event.rolloutKey,
  };
}

export function emitSelectorOpenEvent(event: SelectorOpenEvent): void {
  try {
    scheduleTelemetry(() => {
      if (openEventBuffer.length >= TELEMETRY_BUFFER_MAX) {
        openEventBuffer.shift();
      }
      openEventBuffer.push(event);

      if (legacyTelemetryBuffer.length >= TELEMETRY_BUFFER_MAX) {
        legacyTelemetryBuffer.shift();
      }
      legacyTelemetryBuffer.push(toLegacyEvent(event));

      if (
        typeof process !== "undefined" &&
        process.env.NODE_ENV !== "production" &&
        selectorEngineConfig.observability.telemetryDebug
      ) {
        console.debug("[selector-telemetry]", event);
      }
    });
  } catch {
    /* fire-and-forget */
  }
}

/** @deprecated use emitSelectorOpenEvent via selector-telemetry-bridge */
export function emitSelectorOpenTelemetry(event: SelectorTelemetryEvent): void {
  emitSelectorOpenEvent({
    event: "selector_open_event",
    eventId: "legacy",
    domain: event.domain,
    surface: event.selector_surface_used,
    optionCountBucket: event.option_count_bucket,
    searchUsed: event.search_used,
    isMobile: false,
    decisionLatencyMs: event.selector_open_time_ms,
    fallbackUsed: false,
    rolloutKey: event.rolloutKey,
    recordedAt: Date.now(),
  });
}
