/**
 * Audit SelectorDecisionEngine v3.1 — SSOT + observability hardening.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const engine = read("lib/selector-core/selector-decision-engine.ts");
const engineConfig = read("lib/selector-core/selector-engine-config.ts");
const fallback = read("lib/selector-core/selector-safe-fallback.ts");
const trace = read("lib/selector-core/selector-decision-trace.ts");
const bridge = read("lib/selector-core/selector-telemetry-bridge.ts");
const surface = read("lib/selector-core/resolve-selector-surface.ts");
const telemetry = read("lib/selector-core/selector-telemetry.ts");
const globalSelect = read("components/gestionale/global-input/global-select.tsx");

assert.match(engine, /SelectorDecisionEngine/);
assert.match(engine, /selector-engine-config/);
assert.doesNotMatch(engine, /selector-decision-engine-config/);

assert.match(engineConfig, /selectorEngineConfig/);
assert.match(engineConfig, /rolloutByDomain/);
assert.match(engineConfig, /thresholds/);
assert.match(engineConfig, /featureFlags/);

assert.match(fallback, /createFallbackDecision/);
assert.match(fallback, /normalizeSelectorContext/);

assert.match(trace, /SelectorDecisionTrace/);
assert.match(trace, /recordSelectorDecisionTrace/);

assert.match(bridge, /emitSelectorOpenFromUI/);
assert.match(bridge, /registerSelectorDecision/);

assert.match(surface, /SelectorDecisionEngine\.resolve/);
assert.match(engine, /isSelectorDomainSheetRolloutEnabled/);

assert.match(telemetry, /selector_open_event/);
assert.match(telemetry, /emitSelectorOpenEvent/);

assert.match(globalSelect, /SelectorDecisionEngine/);
assert.match(globalSelect, /emitSelectorOpenFromUI/);
assert.doesNotMatch(globalSelect, /emitSelectorOpenTelemetry/);
assert.doesNotMatch(globalSelect, /resolveSelectorSurface/);

console.log("selector-decision-engine-audit.test.ts OK");
