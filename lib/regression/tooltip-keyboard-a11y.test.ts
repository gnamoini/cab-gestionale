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
assert.match(tooltip, /role="tooltip"/);
assert.match(tooltip, /title:\s*undefined/);

const disabled = fs.readFileSync(path.join(ROOT, "components/design-system/disabled-element-tooltip.tsx"), "utf8");
assert.match(disabled, /inline-flex/);

console.log("tooltip-keyboard-a11y.test OK");
