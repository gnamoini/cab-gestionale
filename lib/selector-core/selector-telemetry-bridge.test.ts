import assert from "node:assert/strict";
import { SelectorDecisionEngine, __resetSelectorEngineForTests } from "@/lib/selector-core/selector-decision-engine";
import {
  __resetSelectorDecisionTraceForTests,
  getTraceById,
} from "@/lib/selector-core/selector-decision-trace";
import { emitSelectorOpenFromUI } from "@/lib/selector-core/selector-telemetry-bridge";
import {
  clearSelectorTelemetryBuffer,
  getSelectorOpenEventBuffer,
} from "@/lib/selector-core/selector-telemetry";

function flushAsyncTelemetry(): Promise<void> {
  return new Promise((resolve) => {
    queueMicrotask(() => {
      setTimeout(resolve, 0);
    });
  });
}

void (async () => {
  __resetSelectorEngineForTests();
  __resetSelectorDecisionTraceForTests();
  clearSelectorTelemetryBuffer();

  const decision = SelectorDecisionEngine.resolve({
    domain: "addetti",
    mode: "selectOnly",
    optionCount: 21,
    isMobile: true,
    isDynamicList: false,
    isOperationalFilter: false,
  });

  assert.ok(decision.traceId, "decision exposes traceId");
  const trace = getTraceById(decision.traceId!);
  assert.ok(trace, "trace registered by engine");

  emitSelectorOpenFromUI(decision.traceId!, {
    isMobile: true,
    optionCount: 21,
    domain: "addetti",
  });

  await flushAsyncTelemetry();

  const events = getSelectorOpenEventBuffer();
  assert.equal(events.length, 1);
  assert.equal(events[0]?.event, "selector_open_event");
  assert.equal(events[0]?.surface, decision.surface);
  assert.equal(events[0]?.fallbackUsed, false);
  assert.equal(events[0]?.isMobile, true);

  console.log("selector-telemetry-bridge.test.ts OK");
})();
