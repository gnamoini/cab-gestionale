import assert from "node:assert/strict";
import { analyzeSelectorTelemetry } from "@/lib/selector-core/selector-adaptive-analyzer";
import type { SelectorOpenEvent } from "@/lib/selector-core/selector-telemetry";

function event(partial: Partial<SelectorOpenEvent> & Pick<SelectorOpenEvent, "domain">): SelectorOpenEvent {
  return {
    event: "selector_open_event",
    eventId: partial.eventId ?? "e1",
    domain: partial.domain,
    surface: partial.surface ?? "dropdown",
    optionCountBucket: partial.optionCountBucket ?? "20-100",
    searchUsed: partial.searchUsed ?? true,
    isMobile: partial.isMobile ?? true,
    decisionLatencyMs: partial.decisionLatencyMs ?? 2,
    fallbackUsed: partial.fallbackUsed ?? false,
    recordedAt: partial.recordedAt ?? Date.now(),
    rolloutKey: partial.rolloutKey,
  };
}

const events: SelectorOpenEvent[] = [];
for (let i = 0; i < 12; i += 1) {
  events.push(
    event({
      eventId: `addetti-${i}`,
      domain: "addetti",
      surface: "dropdown",
      searchUsed: true,
      optionCountBucket: "20-100",
    }),
  );
}

const report = analyzeSelectorTelemetry(events);
assert.equal(report.eventCount, 12);
assert.equal(report.insights.length, 1);
assert.equal(report.insights[0]?.domain, "addetti");
assert.equal(report.insights[0]?.currentBehavior.preferredSurface, "dropdown");
assert.ok(report.insights[0]?.recommendation.confidence > 0);
assert.ok(report.insights[0]?.recommendation.reason.length > 0);

console.log("selector-adaptive-analyzer.test.ts OK");
