import assert from "node:assert/strict";
import {
  aggregateSelectorTelemetry,
  computeUsageRatios,
  groupByDomain,
} from "@/lib/selector-core/selector-telemetry-aggregator";
import type { SelectorOpenEvent } from "@/lib/selector-core/selector-telemetry";

const fixture: SelectorOpenEvent[] = [
  {
    event: "selector_open_event",
    eventId: "1",
    domain: "addetti",
    surface: "dropdown",
    optionCountBucket: "20-100",
    searchUsed: true,
    isMobile: true,
    decisionLatencyMs: 2,
    fallbackUsed: false,
    recordedAt: 1,
  },
  {
    event: "selector_open_event",
    eventId: "2",
    domain: "addetti",
    surface: "dropdown",
    optionCountBucket: "20-100",
    searchUsed: true,
    isMobile: true,
    decisionLatencyMs: 3,
    fallbackUsed: false,
    recordedAt: 2,
  },
  {
    event: "selector_open_event",
    eventId: "3",
    domain: "report",
    surface: "sheet",
    optionCountBucket: "6-20",
    searchUsed: true,
    isMobile: false,
    decisionLatencyMs: 20,
    fallbackUsed: false,
    recordedAt: 3,
  },
];

assert.equal(groupByDomain([]).size, 0);
assert.equal(groupByDomain(fixture).get("addetti")?.length, 2);

const ratios = computeUsageRatios(fixture.filter((e) => e.domain === "addetti"));
assert.equal(ratios.searchUsageRate, 1);
assert.equal(ratios.sheetUsageRate, 0);

const aggregated = aggregateSelectorTelemetry(fixture);
assert.ok(aggregated.has("addetti"));
assert.equal(aggregated.get("addetti")?.preferredSurface, "dropdown");
assert.equal(aggregated.get("addetti")?.dropdownAbandonRate, null);

console.log("selector-telemetry-aggregator.test.ts OK");
