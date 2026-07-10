import assert from "node:assert/strict";
import { clampTooltipStatusLines, MAX_TOOLTIP_STATUS_LINES } from "@/components/design-system/tooltip-status-model";

const lines = Array.from({ length: 10 }, (_, i) => ({ label: `k${i}`, value: `v${i}` }));
const out = clampTooltipStatusLines(lines);
assert.equal(out.length, MAX_TOOLTIP_STATUS_LINES + 1);
assert.equal(out[MAX_TOOLTIP_STATUS_LINES]?.value, "… altri dettagli");
console.log("tooltip-status-clamp.test OK");
