/**
 * Tooltip keyboard / a11y contract (static).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const useTooltip = fs.readFileSync(path.join(ROOT, "components/design-system/use-tooltip.ts"), "utf8");
const tooltip = fs.readFileSync(path.join(ROOT, "components/design-system/tooltip.tsx"), "utf8");

assert.match(useTooltip, /onFocus/);
assert.match(useTooltip, /showOnFocus/);
assert.match(useTooltip, /hideImmediate/);
assert.match(useTooltip, /transform:\s*false/);
assert.match(useTooltip, /fallbackPlacements:\s*\["bottom"\]/);
assert.match(useTooltip, /let initialPass = true/);
assert.match(useTooltip, /update\(\)/);
assert.match(tooltip, /role="tooltip"/);
assert.match(tooltip, /data-cab-tooltip-portal|CAB_TOOLTIP_PORTAL_ATTR/);
assert.doesNotMatch(tooltip, /scale-95/);
assert.match(tooltip, /title:\s*undefined/);

const disabled = fs.readFileSync(path.join(ROOT, "components/design-system/disabled-element-tooltip.tsx"), "utf8");
assert.match(disabled, /flex w-full min-w-0/);

console.log("tooltip-keyboard-a11y.test OK");
