/**
 * UI governance contract + tooltip API stability.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  UI_CONTRACT_VERSION,
  UI_PRIMITIVE_VERSIONS,
  TOOLTIP_CONTRACT,
} from "@/lib/ui-design-system-lock/component-contracts";
import { clampTooltipStatusLines, MAX_TOOLTIP_STATUS_LINES } from "@/components/design-system/tooltip-status-model";
import type { TooltipProps } from "@/components/design-system/tooltip";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

assert.match(UI_CONTRACT_VERSION, /^\d+\.\d+\.\d+$/);
assert.equal(TOOLTIP_CONTRACT.consumerImportPath, "@/components/ui");
assert.ok(UI_PRIMITIVE_VERSIONS.Tooltip);

// API stabile: content su TooltipProps, no trigger compositional
type _ContentRequired = Pick<TooltipProps, "content" | "children">;
type _NoTrigger = "trigger" extends keyof TooltipProps ? never : true;
const _apiCheck: _NoTrigger = true;
void _apiCheck;

const tooltipSrc = read("components/design-system/tooltip.tsx");
assert.match(tooltipSrc, /export type TooltipProps/);
assert.doesNotMatch(tooltipSrc, /TooltipTrigger/);

const clamped = clampTooltipStatusLines(
  Array.from({ length: 10 }, (_, i) => ({ label: `L${i}`, value: `V${i}` })),
);
assert.equal(clamped.length, MAX_TOOLTIP_STATUS_LINES + 1);
assert.match(clamped[clamped.length - 1]?.value ?? "", /altri dettagli/);

const barrel = read("components/ui/index.ts");
assert.match(barrel, /TooltipList/);
assert.match(barrel, /GlobalAnchoredMenu/);

const gallery = read("app/(gestionale)/report/design-system-preview/page.tsx");
for (const section of ["tooltip", "lists", "overlays", "states", "accessibility"]) {
  assert.match(gallery, new RegExp(section, "i"), `gallery missing section: ${section}`);
}

console.log("tooltip-contract-api.test OK");
